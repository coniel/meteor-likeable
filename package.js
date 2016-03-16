Package.describe({
    name: "coniel:likeable",
    summary: "A package implementing social \"liking\" or \"starring\"",
    version: "0.0.1",
    git: "https://github.com/coniel/meteor-likeable.git"
});

Package.onUse(function(api) {
    api.versionsFrom("1.2");

    api.use([
        "coniel:linkable-model@0.0.1",
        "mdg:validated-method@1.0.1",
        "didericis:callpromise-mixin@0.0.1",
        "tunifight:loggedin-mixin@0.1.0",
        "ecmascript",
        "es5-shim"
    ]);

    api.imply("coniel:linkable-model");

    //Add the friend-model files
    api.addFiles("common/likeable-model.js");
    api.addFiles("common/like-model.js");


    api.export(["LikeableModel", "Like"]);
});
