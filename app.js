/*
** A simple example of using Web Bluetooth to access a Ketonix device
** By Michel Lundell
** Sön 30 Mar 2025 10:05:33 CEST
*/

var ppm=0; var stick=0;
var isChromium = window.chrome;
var winNav = window.navigator;
var vendorName = winNav.vendor;
var isOpera = typeof window.opr !== "undefined";
var isIEedge = winNav.userAgent.indexOf("Edge") > -1;
var isIOSChrome = winNav.userAgent.match("CriOS");
var myCharacteristic;
var execOnce = 1;


if (isIOSChrome) {
  document.getElementById("messageUI").textContent = "Chrome on iOS is not supported";
} else if(
  isChromium !== null &&
  typeof isChromium !== "undefined" &&
  vendorName === "Google Inc." &&
  isOpera === false &&
  isIEedge === false
) {
   isChrome=true;
} else { 
   isChrome=false;
}


window.addEventListener('DOMContentLoaded', function() {
 document.getElementById("messageUI").textContent = "document loaded";
 document.getElementById("connectedUI").textContent = "disconnected";
 document.getElementById("typeUI").textContent = "unknown";
 document.getElementById("isReadyUI").textContent = "unknown";
 document.getElementById("ppmUI").textContent = "unknown";
});


function onStartButtonClick() {
 document.getElementById("messageUI").textContent = "Connecting ...";
  let serviceUuid = document.querySelector('#service').value;
  if (serviceUuid.startsWith('0x')) {
    serviceUuid = parseInt(serviceUuid);
  }

  let characteristicUuid = document.querySelector('#characteristic').value;
  if (characteristicUuid.startsWith('0x')) {
    characteristicUuid = parseInt(characteristicUuid);
  }

 document.getElementById("messageUI").textContent = "Requesting Bluetooth Device...";
  navigator.bluetooth.requestDevice({filters: [{services: [serviceUuid]}]})
  .then(device => {
 document.getElementById("messageUI").textContent = "Connecting to GATT Server...";
    return device.gatt.connect();
  })
  .then(server => {
    document.getElementById("messageUI").textContent = "Getting Service...";
    return server.getPrimaryService(serviceUuid);
  })
  .then(service => {
    document.getElementById("messageUI").textContent = "Getting Characteristic...";
    return service.getCharacteristic(characteristicUuid);
  })
  .then(characteristic => {
    myCharacteristic = characteristic;
    return myCharacteristic.startNotifications().then(_ => {
        document.getElementById("connectedUI").textContent = "Connected";
        myCharacteristic.addEventListener('characteristicvaluechanged', handleNotifications);
    });
  })
  .catch(error => {
    document.getElementById("messageUI").textContent = error;
  });
}

function onStopButtonClick() {
  if (myCharacteristic) {
    myCharacteristic.stopNotifications()
    .then(_ => {
      myCharacteristic.removeEventListener('characteristicvaluechanged', handleNotifications);
    })
    .catch(error => {
      document.getElementById("messageUI").textContent = error;
    });
  }
}

function handleNotifications(event) {
  let value = event.target.value;
  let a = [];
  var arr = new Uint16Array(value);
  var type = value.getUint8(0);
  var isReady = value.getUint8(2) + (value.getUint8(3) << 8);
  var ketonixValue = 0;

  /* Old models */
  if( type == 4 || type == 5 ) {
  	ketonixValue = 0.3453*Math.exp(0.0079*r) - 0.76;
  }
  /* Green models */
  if( type == 6 || type == 7 ) {
  	ketonixValue = value.getUint8(4) + (value.getUint8(5) << 8);
  }

  /* Decimals is really not needed, technique is a huge factor in readings */
  var fixedPPM = ketonixValue.toFixed(0);

  /* If for some reason value is < 0 ... */
  if( ketonixValue < 1 ) { fixedPPM = 0; }
  
  /* If fixedPPM < 1 and stick is zero (saved the value) then set stick = 1 */
  if( fixedPPM < 1 && stick == 0) {
	  fixedPPM = 0;
	  ppm = 0;
	  stick = 1;
  }

  /* If stick == 1 then we keep the highest reading */
  if( stick == 1 && Number(ppm) < Number(fixedPPM) ) {
	  ppm = Number(fixedPPM);
  } 

  /* If stick == 0 then we just update the reading */
  if( stick == 0) { 
	  ppm = Number(fixedPPM);
  }
 
  /* If isReady == 0, then we just display 0 as value */
  if( isReady == 0 ) {
	  ppm = 0;

    /* Display wait ... message just once */
	  if( execOnce == 1 ) {
		  execOnce = 0;
      document.getElementById("messageUI").textContent = "Wait while the sensor is warming up and calibrates...";
	  }
  } else {
	  if(ppm == 0 && stick == 1 ) {
      document.getElementById("messageUI").textContent = "Ready to measure";
	  } else if( ppm > 0 && stick == 0) {
      document.getElementById("messageUI").textContent = "Wait while gas evaporates from the sensor ...";
	  } else if( ppm > 0 && stick == 1) {
      document.getElementById("messageUI").textContent = "Continue exhale as long as you feel comfortable... then click Save";
	  }
	  // console.log("ppm="+ppm);
  }
  document.getElementById("typeUI").textContent = type;
  document.getElementById("isReadyUI").textContent = isReady;
  document.getElementById("ppmUI").textContent = ppm;;
}
    
document.querySelector('#startNotifications').addEventListener('click', function(event) {
    event.stopPropagation();
    event.preventDefault();
    if (isWebBluetoothEnabled()) {
      execOnce = 1;
      onStartButtonClick();
    }
});

document.querySelector('#stopNotifications').addEventListener('click', function(event) {
    event.stopPropagation();
    event.preventDefault();
    if (isWebBluetoothEnabled()) {
      onStopButtonClick();
      document.getElementById("connectedUI").textContent = "Disonnected";
    }
});

document.querySelector('#saveButton').addEventListener('click', function(event) {
    event.stopPropagation();
    event.preventDefault();
    if (isWebBluetoothEnabled()) {
      /* save ppm to database and gui */
     /* .... */
      /* release sticky value */
      stick = 0;
      alert("Measurement="+ppm+" PPM");
    }
});

function isWebBluetoothEnabled() {
    if (navigator.bluetooth) {
      return true;
    } else {
      document.getElementById("messageUI").textContent = "Web Bluetooth API is not available.<br/>Please make sure the Experimental Web Platform features flag is enabled.";
      return false;
    }
}
