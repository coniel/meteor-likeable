/**
 * A model of a like which is connected to another database object
 * @class Like
 */
Like = BaseModel.extendAndSetupCollection("likes", {
    userId: true
});

LinkableModel.makeLinkable(Like);

/**
 * Get the User instance of the account which created the like
 * @returns {User} The user who created the like
 */
Like.prototype.user = function () {
    return Meteor.users.findOne(this.userId);
};

/**
 * Check if the user has already liked the linked object
 * @returns {[[Type]]} [[Description]]
 */
Like.prototype.isDuplicate = function () {
    return !!LikesCollection.findOne({userId: this.userId, linkedObjectId: this.linkedObjectId});
};

LikesCollection = Like.collection;

Like.appendSchema(LinkableModel.LinkableSchema);

Like.meteorMethods({
    insert: new ValidatedMethod({
        name: 'likes.insert',
        mixins: [CallPromiseMixin, LoggedInMixin],
        validate: new SimpleSchema({
            doc: {
                type: Object
            },
            'doc.linkedObjectId': Like.getSchemaKey('linkedObjectId'),
            'doc.linkedObjectType': Like.getSchemaKey('linkedObjectType')
        }).validator(),
        checkLoggedInError: {
            error: 'notLogged',
            message: 'You need to be logged in to call this method',//Optional
            reason: 'You need to login' //Optional
        },
        run({doc}) {
            // Set userId of to current user
            doc.userId = this.userId;
            var like = new Like(doc);

            if (like.isDuplicate()) {
                throw new Meteor.Error("alreadyLikedByUser");
            }

            // Get the parent object
            var parent = like.linkedObject();

            if (!parent) {
                throw new Meteor.Error("noLinkedObject");
            }

            // object type and id to validate against
            var checkOnType = like.linkedObjectType;
            var checkOnId = parent;
            if (parent.parentLinkedObjectType && parent.parentLinkedObjectId) {
                // If the linked object has a grandparent, validate against the grandparent
                checkOnType = parent.parentLinkedObjectType;
                checkOnId = parent.parentLinkedObjectId;

                // Add the linked objects grandparent as a grandparent
                doc.parentLinkedObjectType = checkOnType;
                doc.parentLinkedObjectId = checkOnId;
            } else if (parent.linkedObjectType && parent.linkedObjectId) {
                // Add the linked objects parent as a grandparent
                doc.parentLinkedObjectType = parent.linkedObjectType;
                doc.parentLinkedObjectId = parent.linkedObjectId;

                if (LikeableModel.options[checkOnType] || (LikeableModel.options[checkOnType] && !!LikeableModel.options[checkOnType].authorizeOnGrandParent)) {
                    // If the linked object has a prent, validate against the parent
                    checkOnType = parent.linkedObjectType;
                    checkOnId = parent.linkedObjectId;
                }
            }

            if (Can.createIn('like', doc, checkOnType, checkOnId)) {
                return Like.collection.insert(doc, (error, result) => {
                    if (!error) {
                        var collection = LinkableModel.getCollectionForRegisteredType(like.linkedObjectType);
                        if (collection) {
                            collection.update(like.linkedObjectId, {$inc: {_likeCount: 1}});
                        }
                    }
                });
            }
        }
    }),
    remove: new ValidatedMethod({
        name: 'likes.remove',
        mixins: [CallPromiseMixin, LoggedInMixin],
        validate: Like.getSubSchema(["_id"], null, true),
        checkLoggedInError: {
            error: 'notLogged',
            message: 'You need to be logged in to call this method',//Optional
            reason: 'You need to login' //Optional
        },
        run({_id}) {
            var like = Like.collection.findOne({_id: _id});

            if (like.checkOwnership()) {
                Like.collection.remove({_id: _id}, (error, result) => {
                    if (!error) {
                        var collection = LinkableModel.getCollectionForRegisteredType(like.linkedObjectType);
                        if (collection) {
                            collection.update(like.linkedObjectId, {$inc: {_likeCount: -1}});
                        }
                    }
                });
            }
        }
    })
});
