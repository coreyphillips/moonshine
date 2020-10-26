var exec = require('child_process').exec;
var os = require('os');

function postInstallMac() {
  exec(
    'rn-nodeify --install buffer,stream,assert,events,crypto,vm,process --hack && cd ios && pod install && cd ..',
  );
}
function postInstallLinWin() {
  exec(
    'rn-nodeify --install buffer,stream,assert,events,crypto,vm,process --hack',
  );
}

if (os.type() === 'Darwin') {
  postInstallMac();
} else {
  postInstallLinWin();
}
