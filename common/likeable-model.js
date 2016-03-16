LikeableModel = {
    options: {}
};

LikeableModel.makeLikeable = function (model, type, options) {
    if (model.appendSchema && type) {
        LikeableModel.options[type] = options;
        model.appendSchema(LikeableSchema);
        LinkableModel.registerLinkableType(model, type);
        _.extend(model.prototype, likeableMethods);
    } else {
        throw new Meteor.Error("makeLikeableFailed", "Could not make model likeable. Please make sure you passed in a model and type");
    }
};

var likeableMethods = {
    /**
     * Add a record to the likes collection which is linked to the model
     */
    like: function () {
        if (!this.isLikedBy(Meteor.user())) {
            var type = this._objectType;
            new Like({linkedObjectId: this._id, linkedObjectType: type}).save();
        }
    },

    /**
     * Remove a record from the likes collection that is linked to the model
     */
    unlike: function () {
        //find and then call call instance.remove() since client
        //is restricted to removing items by their _id
        var like = LikesCollection.findOne({userId: Meteor.userId(), linkedObjectId: this._id});
        like && like.remove();
    },

    /**
     * Add or remove a record from the likes collection that is linked to the model
     */
    toggleLike: function () {
        if (this.isLikedBy(Meteor.user())) {
            this.unlike();
        } else {
            this.like();
        }
    },

    /**
     * Get all the likes for the model
     * @returns {Mongo.Cursor} A mongo cursor which returns Like instances
     */
    likes: function () {
        return LikesCollection.find({linkedObjectId: this._id});
    },

    /**
     * Get the total number of likes for the model
     * @returns {Number} The total number of likes
     */
    likeCount: function () {
        //This creates backwards compatibility for when we stored userId's in an array on the liked object
        return _.isArray(this._likeCount) ? this._likeCount.length : this._likeCount || 0;
    },

    likedBy: function () {
        if (this.likes) {
            var likes = this.likes.reverse();
            var likeStrings = [];
            var currentUser = Meteor.users.findOne(Meteor.userId(), {reactive: false});

            var ending = likes.length > 1 ? " like" : " likes";

            _(likes).each(function (userId) {
                var user = Meteor.users.findOne(userId, {reactive: false});
                var username;
                if (user && !currentUser.blocksUser(user)) {
                    username = user._id === Meteor.userId() ? "You" : user.username;

                    var likeString = '<a href="' + user.profileUrl() + '">' + username + '</a>';
                    likeStrings.push(likeString);
                }
            });

            if (!_(likeStrings).isEmpty()) {
                return Spacebars.SafeString(_.toSentenceSerial(likeStrings, ", ", " and ") + "<wbr>" + ending + " this");
            }
        }
    },

    /**
     * Check if the model is liked by a certain user
     * @param   {Object}  user A User instance to check against
     * @returns {Boolean} Wheter the user likes the model or not
     */
    isLikedBy: function (user) {
        return !!LikesCollection.findOne({linkedObjectId: this._id, userId: user._id});
    },
};

//a schema which can be attached to other likeable types
//if you extend a model with LikeableModel you will need to
//attach this schema to it's collection as well.
var LikeableSchema = new SimpleSchema({
    _likeCount: {
        type: Number,
        autoValue: function () {
            if (this.isInsert) {
                return 0;
            }
        }
    }
});
