import declare from 'dojo/_base/declare';
import BaseWidget from 'jimu/BaseWidget';
import i18n from 'dojo/i18n!./nls/strings';
import array from 'dojo/_base/array';
import lang from 'dojo/_base/lang';
import on from 'dojo/on';
import Message from 'jimu/dijit/Message';
import domClass from 'dojo/dom-class';
import Deferred from 'dojo/Deferred';
import esriRequest from 'esri/request';
import sniff from 'dojo/sniff';
import dom from 'dojo/dom';
import util from './util';
import Konva from './libs/konva.min';

// esri modules
import Point from 'esri/geometry/Point';
import MapImageLayer from 'esri/layers/MapImageLayer';
import MapImage from 'esri/layers/MapImage';
import screenUtils from 'esri/geometry/screenUtils';

// To create a widget, you need to derive from BaseWidget.
export default declare([BaseWidget], {

  // Custom widget code goes here

  baseClass: 'geo-ref-plats',

  // add additional properties here
  i18n: i18n,
  SHAPETYPE_ICONS: [{
    "type": "jpg",
    "url": "images/filetypes/jpg.svg"
  }, {
    "type": "png",
    "url": "images/filetypes/png.svg"
  }],
  geoRefImage: null,
  xPos: 60,
  mil: null,
  // methods to communication with app container:
  postCreate() {
    this.inherited(arguments);
  },

  startup() {
    var handImg = dom.byId("movePicURL");
    var resizeImg = dom.byId("resizeUrl");
    handImg.src = this.folderUrl + 'images/hand.png';
    resizeImg.src = this.folderUrl + 'images/resizeImage.png';

    this.dropContainer.style.display = '';
    this.finishButtonDiv.style.display = 'none';
    this.clearButtonDiv.style.display = 'none';

    const self = this,
      dropNode = this.dropArea;
    this.inherited(arguments);

    // add the images to the upload ui widget
    if (i18n.addFromFile.types) {
      try {
        for (var fileTypeName in i18n.addFromFile.types) {
          this._createFileTypeImage(fileTypeName);
        }
      } catch (ex) {
        console.warn("Error reading support file types:");
        console.warn(ex);
      }
    }

    this.own(on(this.fileNode, "change", function(e) {
      if (!self._getBusy()) {
        self._setBusy(true);
        var fileInfo = self._getFileInfo();
        if (fileInfo.ok) {
          self._addFileToCanvas(e.target.files[0]);
        }
      }
    }));

    this.own(on(this.uploadLabel, "click", function(event) {
      if (self._getBusy()) {
        event.preventDefault();
        event.stopPropagation();
      }
    }));

    this.own(on(dropNode, "dragenter", function(event) {
      event.preventDefault();
      if (!self._getBusy()) {
        domClass.add(dropNode, "hit");
        self._setStatus("");
      }
    }));
    this.own(on(dropNode, "dragleave", function(event) {
      event.preventDefault();
      domClass.remove(dropNode, "hit");
    }));
    this.own(on(dropNode, "dragover", function(event) {
      event.preventDefault();
    }));
    this.own(on(dropNode, "drop", function(event) {
      event.preventDefault();
      event.stopPropagation();
      //console.warn("drop");
      if (!self._getBusy()) {
        self._setBusy(true);
        var fileInfo = self._getFileInfo(event);
        if (fileInfo.ok) {
          self._addFileToCanvas(event.dataTransfer.files[0]);
          // self._execute(fileInfo);
        }
      }
    }));

    // by default, dropping a file on a page will cause
    // the browser to navigate to the file
    var nd = this.domNode;
    this.own(on(nd, "dragenter", function(event) {
      event.preventDefault();
    }));
    this.own(on(nd, "dragleave", function(event) {
      event.preventDefault();
    }));
    this.own(on(nd, "dragover", function(event) {
      event.preventDefault();
    }));
    this.own(on(nd, "drop", function(event) {
      event.preventDefault();
    }));

    this.own(on(this.hintButton, "click", lang.hitch(this, function(event) {
      event.preventDefault();

      var test = self.helptext();

      new Message({
        message: test
      });
    })));
  },
  helptext: function() {
    return '<div class="intro">' +
      '<label>' + i18n.addFromFile.intro + "</label>" +
      '<ul>' +
      '<li>' + i18n.addFromFile.types.JPG + '</li>' +
      '<li>' + i18n.addFromFile.types.PNG + '</li>' +
      //  '<li>' + i18n.addFromFile.types.TIF + '</li>' +
      '</ul>' +
      '</div>';
  },
  _createFileTypeImage: function(fileTypeName) {
    var isRTL = window.isRTL;
    array.some(this.SHAPETYPE_ICONS, lang.hitch(this, function(filetypeIcon, index) {
      if (fileTypeName.toLowerCase() === filetypeIcon.type) {
        var iconImg = document.createElement("IMG");
        iconImg.src = this.folderUrl + filetypeIcon.url;
        iconImg.alt = fileTypeName;
        if (index === 0) {
          iconImg.className += " " + (isRTL ? "last" : "first") + "-type-icon";
        } else if (index === 1) {
          iconImg.className += " second-" + (isRTL ? "last" : "first") + "-type-icon";
        } else if (index === (this.SHAPETYPE_ICONS.length - 2)) {
          iconImg.className += " second-" + (isRTL ? "first" : "last") + "-type-icon";
        } else if (index === (this.SHAPETYPE_ICONS.length - 1)) {
          iconImg.className += " " + (isRTL ? "first" : "last") + "-type-icon";
        }
        this.supportedFileTypes.appendChild(iconImg);
      }
    }));
  },
  clearClicked: function() {
    this.clearButtonDiv.style.display = 'none';
    this.mil.removeAllImages();
  },
  finishClicked: function() {
    var btn = this.finishButton;
    if (domClass.contains(btn, "disabled")) {
      return;
    }

    var xMax, xMin, yMin, yMax;
    let container = document.getElementById('container3');
    let xOffset = this._getOffBoxOffset(container.style.left, 41);
    let yOffset = this._getOffBoxOffset(container.style.top, 90);
    // console.log('offsets x, y', xOffset, yOffset);
    var newPT = new Point(this.geoRefImage.getAbsolutePosition().x + xOffset, this.geoRefImage.getAbsolutePosition().y + yOffset);
    var newMapPoint = screenUtils.toMapGeometry(this.map.extent, this.map.width, this.map.height, newPT);
    xMin = newMapPoint.x;
    yMax = newMapPoint.y;
    newPT = new Point(this.geoRefImage.getAbsolutePosition().x + xOffset + this.geoRefImage.getWidth(), this.geoRefImage.getAbsolutePosition().y + yOffset);
    newMapPoint = screenUtils.toMapGeometry(this.map.extent, this.map.width, this.map.height, newPT);
    newPT = new Point(this.geoRefImage.getAbsolutePosition().x + xOffset, this.geoRefImage.getAbsolutePosition().y + yOffset + this.geoRefImage.getHeight());
    newMapPoint = screenUtils.toMapGeometry(this.map.extent, this.map.width, this.map.height, newPT);
    newPT = new Point(this.geoRefImage.getAbsolutePosition().x + xOffset + this.geoRefImage.getWidth(), this.geoRefImage.getAbsolutePosition().y + yOffset + this.geoRefImage.getHeight());
    newMapPoint = screenUtils.toMapGeometry(this.map.extent, this.map.width, this.map.height, newPT);
    xMax = newMapPoint.x;
    yMin = newMapPoint.y;
    if (this.mil === null) {
      this.mil = new MapImageLayer({
        'id': 'Georeferenced Image'
      });
      this.mil.opacity = 1.0;
      this.map.addLayer(this.mil);
    }
    const mi = new MapImage({
      'extent': {
        'xmin': xMin,
        'ymin': yMin,
        'xmax': xMax,
        'ymax': yMax,
        'spatialReference': {
          'wkid': this.map.spatialReference.wkid
        }
      },
      'href': this.geoRefImage.attrs.image.src
    });
    this.mil.addImage(mi);
    this.finishButtonDiv.style.display = 'none';
    this.dropContainer.style.display = '';
    this.clearButtonDiv.style.display = '';
    dom.byId(this.id + '_file').value = '';
    document.getElementById('container3').style.display = 'none';
  },
  _getOffBoxOffset: function(px, startOffset) {
    let numPx = px.slice(0, px.indexOf('px'));
    return numPx * 1 + 10 + startOffset;
  },

  _execute: function(fileInfo) {
    this._setBusy(true);
    var fileName = fileInfo.fileName;
    this._setStatus(i18n.addFromFile.addingPattern
      .replace("{filename}", fileName));
    var self = this,
      formData = new FormData();
    formData.append("file", fileInfo.file);
    // console.log(job);
    self._setBusy(false);
    self._setStatus(i18n.addFromFile.addFailedPattern
      .replace("{filename}", fileName));
  },

  _analyze: function(job, formData) {
    if (job.fileType.toLowerCase() !== "csv") {
      var dfd = new Deferred();
      dfd.resolve(null);
      return dfd;
    }
    var url = job.sharingUrl + "/content/features/analyze";
    var content = {
      f: "json",
      filetype: job.fileType.toLowerCase()
    };
    var req = esriRequest({
      url: url,
      content: content,
      form: formData,
      handleAs: "json"
    });
    req.then(function(response) {
      //console.warn("Analyzed:",response);
      if (response && response.publishParameters) {
        job.publishParameters = response.publishParameters;
      }
    });
    return req;
  },

  _getBaseFileName: function(fileName) {
    var a, baseFileName = fileName;
    if (sniff("ie")) { //fileName is full path in IE so extract the file name
      a = baseFileName.split("\\");
      baseFileName = a[a.length - 1];
    }
    a = baseFileName.split(".");
    //Chrome and IE add c:\fakepath to the value - we need to remove it
    baseFileName = a[0].replace("c:\\fakepath\\", "");
    return baseFileName;
  },

  _getBusy: function() {
    return domClass.contains(this.uploadLabel, "disabled");
  },

  _getFileInfo: function(dropEvent) {
    var file, files;
    var info = {
      ok: false,
      file: null,
      fileName: null,
      fileType: null
    };
    if (dropEvent) {
      files = dropEvent.dataTransfer.files;
    } else {
      files = this.fileNode.files;
    }
    if (files && files.length === 1) {
      info.file = file = files[0];
      info.fileName = file.name;
      if (util.endsWith(file.name.toLowerCase(), ".jpg")) {
        info.ok = true;
        info.fileType = "JPG";
      } else if (util.endsWith(file.name.toLowerCase(), ".png")) {
        info.ok = true;
        info.fileType = "PNG";
      } else if (util.endsWith(file.name.toLowerCase(), ".tif")) {
        //info.ok = true;
        info.fileType = "TIF";
      } else if (util.endsWith(file.name.toLowerCase(), ".tiff")) {
        //info.ok = true;
        info.fileType = "TIF";
      }
    }
    if (info.ok) {
      info.baseFileName = this._getBaseFileName(info.fileName);
    } else {
      var msg = i18n.addFromFile.invalidType,
        usePopup = true;
      if (typeof info.fileName === "string" && info.fileName.length > 0) {
        msg = i18n.addFromFile.invalidTypePattern
          .replace("{filename}", info.fileName);
      }
      this._setBusy(false);
      this._setStatus(msg);
      if (usePopup && files.length > 0) {
        var nd = document.createElement("div");
        nd.appendChild(document.createTextNode(msg));
        new Message({
          titleLabel: i18n._widgetLabel,
          message: nd
        });
      }
    }
    return info;
  },

  _addCanvasDiv: function() {
    const canvasDiv = document.createElement('div');
    canvasDiv.className = 'image-canvas';
    canvasDiv.style.position = 'absolute';
    canvasDiv.style.top = '50px';
    canvasDiv.style.left = '50px';
    canvasDiv.id = 'container3';
    this.map.container.insertBefore(canvasDiv, this.map.container.firstChild);
  },

  _addFileToCanvas: function(file) {
    const self = this;
    var reader = new FileReader();
    reader.onload = function(event) {
      var img = new Image();
      img.onload = function() {
        self._addCanvasDiv();
        self._initStage(img);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  },

  _getImage: function(filename, shape) {
    var imageObj = new Image();
    imageObj.onload = function() {
      shape.fillPatternImage(imageObj);
    };
    imageObj.src = filename;
  },

  _loadImages: function(sources) {
    // console.log(sources);
    const dfd = new Deferred();
    var images = {};
    var loadedImages = 0;
    var numImages = 0;
    for (var src in sources) {
      if (sources.hasOwnProperty(src)) {
        numImages++;
      }
    }
    for (var src2 in sources) {
      if (sources.hasOwnProperty(src2)) {
        images[src2] = new Image();
        images[src2].onload = function() {
          if (++loadedImages >= numImages) {
            dfd(images);
          }
        };
        images[src2].src = sources[src2];
      }
    }
    return dfd;
  },

  _initStage: function(images) {
    const stage = new Konva.Stage({
      container: 'container3',
      width: 320,
      height: 320,
      name: 'geoRef'
    });
    var geoRefGroup = new Konva.Group({
      x: 10,
      y: 12,
      //draggable: true
    });
    var layer = new Konva.Layer();
    layer.setOpacity(0.8);
    layer.add(geoRefGroup);
    stage.add(layer);
    this.geoRefImage = new Konva.Image({
      x: 0,
      y: 0,
      image: images,
      width: 300,
      height: 300,
      name: 'image'
    });

    geoRefGroup.add(this.geoRefImage);
    this._addAnchor(geoRefGroup, 0, 0, 'topLeft', this.folderUrl + './images/hand.png');
    this._addAnchor(geoRefGroup, 300, 0, 'topRight', '');
    this._addAnchor(geoRefGroup, 300, 300, 'bottomRight', this.folderUrl + './images/resizeImage.png');
    this._addAnchor(geoRefGroup, 0, 300, 'bottomLeft', '');
    geoRefGroup.on('dragstart', function() {
      this.moveToTop();
    });

    this._addSlider(stage, layer);
    stage.draw();
    this.dropContainer.style.display = 'none';
    this.clearButtonDiv.style.display = 'none';
    this.finishButtonDiv.style.display = '';
    this._setBusy(false);
  },
  _addSlider(stage, picLayer) {
    let self = this;
    var trackLength = 200;
    var layer = new Konva.Layer({
      name: 'slider'
    });
    var Track = new Konva.Line({
      x: this.xPos,
      y: 7,
      points: [trackLength, 0, 0, 0, 0, 0, 0, 0],
      stroke: '#BDC3C7',
      strokeWidth: 6,
      visible: true,
      name: 'TrackLine',
      lineCap: 'sqare',
      lineJoin: 'sqare'
    });

    var TrackBall = new Konva.Circle({
      x: this.xPos + (trackLength * 0.8),
      y: 8,
      stroke: '#D35400',
      fill: '#ddd',
      strokeWidth: 2,
      name: 'TrackControl',
      radius: 7,
      draggable: true,
      dragOnTop: false,
      visible: true,
      dragBoundFunc: function(pos) {
        //console.log('Click this.xPos', self.xPos, pos.x, self.xPos * 1 + trackLength);
        let newX = Math.min((self.xPos * 1 + trackLength), Math.max(self.xPos, pos.x));
        let opacity = ((newX - self.xPos) / trackLength).toFixed(2);
        //console.log('opacity', opacity);

        picLayer.setOpacity(opacity);
        picLayer.draw();
        return {
          x: newX,
          y: this.getAbsolutePosition().y
        };
      }
    });
    layer.add(Track);
    layer.add(TrackBall);

    stage.add(layer);
  },
  _updateSlider(stage, width) {
    let sliderLayer = stage.getLayers().filter(layer => layer.attrs.name === 'slider')[0];
    let track = sliderLayer.children.filter(child => child.attrs.name === 'TrackLine')[0];
    let ball = sliderLayer.children.filter(child => child.attrs.name === 'TrackControl')[0];

    let curX = track.attrs.x;
    let trackWidth = track.attrs.points[0];
    this.xPos = ((width - trackWidth) / 2 + 10).toFixed(0);
    if (this.xPos < 10) {
      this.xPos = 10;
    }
    track.x(this.xPos);
    ball.x(ball.x() + (this.xPos - curX));
    sliderLayer.draw();
  },
  _addAnchor(group, x, y, name, image) {
    const self = this;
    let visible = image.length > 0;
    var layer = group.getLayer();
    var anchor = new Konva.Circle({
      x: x,
      y: y,
      stroke: '#666',
      strokeWidth: 2,
      radius: 8,
      name: name,
      visible: visible,
      draggable: true,
      dragOnTop: false,
      fillPatternRepeat: 'no-repeat',
      fillPatternOffsetX: 6,
      fillPatternOffsetY: 6
    });
    this._getImage(image, anchor);
    anchor.on('dragmove', function() {
      self._update(this);
      layer.draw();
    });
    anchor.on('mousedown touchstart', function() {
      group.setDraggable(false);
      this.moveToTop();
    });
    anchor.on('dragend', function() {
      //group.setDraggable(true);
      layer.draw();
    });
    anchor.on('mouseover', function() {
      var layer = this.getLayer();
      document.body.style.cursor = 'pointer';
      this.setStrokeWidth(4);
      layer.draw();
    });
    anchor.on('mouseout', function() {
      var layer = this.getLayer();
      document.body.style.cursor = 'default';
      this.setStrokeWidth(2);
      layer.draw();
    });
    group.add(anchor);
    anchor.draw();
    document.body.style.cursor = 'pointer';
  },
  _update: function(activeAnchor) {
    var group = activeAnchor.getParent();
    var cont = activeAnchor.getParent().getParent().getParent();
    var topLeft = group.get('.topLeft')[0];
    var topRight = group.get('.topRight')[0];
    var bottomRight = group.get('.bottomRight')[0];
    var bottomLeft = group.get('.bottomLeft')[0];
    var image = group.get('Image')[0];

    var anchorX = activeAnchor.getX();
    var anchorY = activeAnchor.getY();

    let container = document.getElementById('container3');
    // update anchor positions
    switch (activeAnchor.getName()) {
      case 'topLeft':
        // console.log('topLeft');
        topRight.setY(anchorY);
        bottomLeft.setX(anchorX);
        container.style.top = this._calcOffset(container.style.top, anchorY);
        container.style.left = this._calcOffset(container.style.left, anchorX);
        break;
      case 'topRight':
        // console.log('topRight');
        topLeft.setY(anchorY);
        bottomRight.setX(anchorX);
        container.style.top = this._calcOffset(container.style.top, anchorY);
        break;
      case 'bottomRight':
        // console.log('bottomRight');
        bottomLeft.setY(anchorY);
        topRight.setX(anchorX);
        break;
      case 'bottomLeft':
        // console.log('bottomLeft');
        bottomRight.setY(anchorY);
        topLeft.setX(anchorX);
        container.style.left = this._calcOffset(container.style.left, anchorX);
        break;
    }

    image.position(topLeft.position());
    var width = topRight.getX() - topLeft.getX();
    var height = bottomLeft.getY() - topLeft.getY();
    this._updateSlider(cont, width);
    if (width && height) {
      image.width(width);
      image.height(height);

      if (width > 20) {
        cont.setWidth(width + 20);
      }
      if (height > 20) {
        cont.setHeight(height + 20);
      }
    }
  },
  _calcOffset: function(px, change) {
    let numPx = px.slice(0, px.indexOf('px'));
    numPx = numPx * 1 + change;
    return numPx + 'px';
  },

  _setBusy: function(isBusy) {
    if (isBusy) {
      domClass.add(this.uploadLabel, "disabled");
      domClass.add(this.dropArea, ["hit", "disabled"]);
    } else {
      domClass.remove(this.uploadLabel, "disabled");
      domClass.remove(this.dropArea, ["hit", "disabled"]);
    }
  },

  _setStatus: function() {
    // if (this) {
    //   this._setStatus(msg);
    // }
  }
});