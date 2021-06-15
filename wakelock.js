var wakeLock = null;
setInterval(function(){ 
	if(document.visibilityState == 'visible') {
		wakeLock = navigator.wakeLock.request('screen');
	}
		
}, 15000);