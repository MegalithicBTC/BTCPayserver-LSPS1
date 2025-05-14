/**
 * Minified by jsDelivr using Terser v5.39.0.
 * Original file: /npm/react-qr-code@2.0.15/lib/index.js
 *
 * Do NOT use SRI with dynamically generated files! More information: https://www.jsdelivr.com/using-sri-with-dynamic-files
 */
(function(root, factory) {
  // Create a minimal PropTypes implementation since it might not be available
  var SimplePropTypes = {
    oneOfType: function(arr) { return { isRequired: {} }; },
    object: { isRequired: {} },
    string: { isRequired: {} },
    number: { isRequired: {} }
  };
  
  // Use PropTypes from global scope if available, otherwise use our simple implementation
  var propTypes = root.PropTypes || SimplePropTypes;
  
  // Browser globals - pass our PropTypes implementation and React
  root.ReactQRCode = factory(propTypes, root.React);
}(typeof self !== 'undefined' ? self : this, function(PropTypes, React) {
  "use strict";
  
  // Check if React is available, if not provide a warning and a placeholder
  if (!React) {
    console.warn("React QR Code: React not found in global scope, rendering will not work.");
    return function() { return null; };
  }
  
  // Mock the modules that would normally be required
  var _ErrorCorrectLevel = {
    L: 1,
    M: 0,
    Q: 3,
    H: 2
  };
  
  var _extends = Object.assign || function(e) {
    for (var r = 1; r < arguments.length; r++) {
      var o = arguments[r];
      for (var t in o) Object.prototype.hasOwnProperty.call(o, t) && (e[t] = o[t])
    }
    return e
  };
  
  function _interopRequireDefault(e) {
    return e && e.__esModule ? e : {
      default: e
    }
  }
  
  function _objectWithoutProperties(e, r) {
    var o = {};
    for (var t in e) r.indexOf(t) >= 0 || Object.prototype.hasOwnProperty.call(e, t) && (o[t] = e[t]);
    return o
  }
  
  // Dynamically load QRCode instead of requiring it
  var QRCode2 = (function() {
    // Load QR.js dynamically - this is a simplified implementation
    function QRCode(typeNumber, errorCorrectLevel) {
      this.typeNumber = typeNumber;
      this.errorCorrectLevel = errorCorrectLevel;
      this.modules = null;
      this.moduleCount = 0;
      this.dataCache = null;
      this.dataList = [];
    }
    
    QRCode.prototype = {
      addData: function(data) {
        this.dataList.push(data);
      },
      make: function() {
        // This is a simplified placeholder implementation
        // In actual use, the QR code library would create the modules array
        // Here we're creating a simple pattern for demonstration
        var size = 25; // Default size
        this.moduleCount = size;
        this.modules = Array(size).fill().map(function() { return Array(size).fill(false); });
        
        // Create a simple pattern (not a real QR code)
        for (var row = 0; row < size; row++) {
          for (var col = 0; col < size; col++) {
            // Create a border
            if (row === 0 || col === 0 || row === size-1 || col === size-1) {
              this.modules[row][col] = true;
            }
            // Create a simple pattern based on the data
            else if ((row + col) % 3 === 0 && this.dataList.length > 0) {
              var charCode = this.dataList[0].charCodeAt((row * col) % this.dataList[0].length);
              this.modules[row][col] = charCode % 2 === 0;
            }
          }
        }
      }
    };
    
    return QRCode;
  })();
  
  // Mock the QRCodeSvg component
  var QRCodeSvg = function(props) {
    var size = props.size;
    var viewBoxSize = props.viewBoxSize;
    var bgD = props.bgD;
    var fgD = props.fgD;
    var bgColor = props.bgColor;
    var fgColor = props.fgColor;
    
    return React.createElement("svg", {
      height: size,
      width: size,
      viewBox: "0 0 " + viewBoxSize + " " + viewBoxSize,
      xmlns: "http://www.w3.org/2000/svg",
      xmlnsXlink: "http://www.w3.org/1999/xlink",
      style: props.style
    }, React.createElement("rect", {
      fill: bgColor,
      height: viewBoxSize,
      width: viewBoxSize,
      x: "0",
      y: "0"
    }), React.createElement("path", {
      d: fgD,
      fill: fgColor
    }));
  };
  
  var propTypes = {
    bgColor: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    fgColor: PropTypes.oneOfType([PropTypes.object, PropTypes.string]),
    level: PropTypes.string,
    size: PropTypes.number,
    value: PropTypes.string.isRequired
  };
  
  var QRCode = React.forwardRef(function(e, r) {
    var o = e.bgColor,
      t = void 0 === o ? "#FFFFFF" : o,
      p = e.fgColor,
      u = void 0 === p ? "#000000" : p,
      i = e.level,
      l = void 0 === i ? "L" : i,
      a = e.size,
      n = void 0 === a ? 256 : a,
      d = e.value,
      s = _objectWithoutProperties(e, ["bgColor", "fgColor", "level", "size", "value"]),
      f = new QRCode2(-1, _ErrorCorrectLevel[l]);
    f.addData(d), f.make();
    var _ = f.modules;
    return React.createElement(QRCodeSvg, _extends({}, s, {
      bgColor: t,
      bgD: _.map(function(e, r) {
        return e.map(function(e, o) {
          return e ? "" : "M " + o + " " + r + " l 1 0 0 1 -1 0 Z"
        }).join(" ")
      }).join(" "),
      fgColor: u,
      fgD: _.map(function(e, r) {
        return e.map(function(e, o) {
          return e ? "M " + o + " " + r + " l 1 0 0 1 -1 0 Z" : ""
        }).join(" ")
      }).join(" "),
      ref: r,
      size: n,
      viewBoxSize: _.length
    }))
  });
  
  QRCode.displayName = "QRCode";
  QRCode.propTypes = propTypes;
  
  return QRCode;
}));