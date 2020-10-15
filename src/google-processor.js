// Set up auth
const vision = require('@google-cloud/vision');
const Promise = require('bluebird');

module.exports = class GoogleProcessor {

    async parseImage(image) {

        // Creates a client
        const client = new vision.ImageAnnotatorClient();
        // Choose what the Vision API should detect
        // Choices are: faces, landmarks, labels, logos, properties, safeSearch, texts
        var types = ['labels'];

        // Send the image to the Cloud Vision API
        // Performs label detection on the image file
        const result = await new Promise((res, err) => {
            client.textDetection(image, function (err, result) {
                if (err) {
                    console.error(err);
			        return res(null, err);
                }
                return res(result);
            });
        });
        if (!result.textAnnotations || !result.textAnnotations) {
            console.error(result);
            throw new Error(result);
        }
        delete result.textAnnotations[0];
        return result.textAnnotations;
    }


    async parseImageToBlocks(image) {

        // Creates a client
        const client = new vision.ImageAnnotatorClient();
        // Choose what the Vision API should detect
        // Choices are: faces, landmarks, labels, logos, properties, safeSearch, texts
        var types = ['labels'];

        // Send the image to the Cloud Vision API
        // Performs label detection on the image file
        const result = await new Promise((res, err) => {
            client.textDetection(image, function (err, result) {
                if (err) {
                    console.error(err);
                    return res(null, err);
                }
                return res(result);
            });
        });

        if (!result.fullTextAnnotation || !result.fullTextAnnotation.pages) {
            console.error(result);
            throw new Error(result);
        }
        return result.fullTextAnnotation.pages[0];
    }

}

