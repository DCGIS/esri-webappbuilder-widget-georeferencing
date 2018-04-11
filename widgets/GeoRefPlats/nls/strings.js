define({
  root: {
    widgetTitle: 'Upload and Georeference Plats',
    description: 'Web AppBuilder widget for uploading plat drawings in JPG format and georeferncing them temporarityly ion the map',
    helpText: "To georeference a plat, either drag and drop an image file (png or jpg) over this widget or browse for the image file by clicking 'Browse' above and navigating to the file.",
    moveExplainText: "The Hand (Upper Left) moves image around. ",
    resizeExplainText: " (Lower Right) resizes both directions.",
    OpacitySlider: "Opacity Slider is at the top of the image.",
    addFromFile: {
      intro: "You can drop or browse for one the following file types:",
      types: {
        "JPG": "A JPEG file of the plat drawing",
        "PNG": "A PNG file of the plat drawing",
        "TIF": "A TIF file of the plat drawing"
      },
      generalizeOn: "Generalize features for web display",
      dropOrBrowse: "Drop or Browse",
      browse: "Browse",
      invalidType: "This file type is not supported.",
      addingPattern: "{filename}: adding...",
      addFailedPattern: "{filename}: add failed",
      featureCountPattern: "{filename}: {count} feature(s)",
      invalidTypePattern: "{filename}: this type is not supported",
      maxFeaturesAllowedPattern: "A maximum of {count} features is allowed",
      layerNamePattern: "{filename} - {name}"
    },
    finishGeoRef: "Finish Image Georeferencing",
    clearGeoRef: "Clear Image Georeferencing"
  }
  // add supported locales below:
  // , "zh-cn": true
});
