var timeStr = '2303121455';

var baseUri = 'https://spa.huijistatic.com/yuee/starrail';

var jsUri = baseUri + '/' + timeStr + '/index.js';
var cssUri = baseUri + '/' + timeStr + '/index.css';

var css = document.createElement('link');
css.rel = 'stylesheet';
css.href = cssUri;
document.head.appendChild(css);

import(jsUri);
