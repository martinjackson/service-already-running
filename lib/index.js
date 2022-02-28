(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define("service-already-running", [], factory);
	else if(typeof exports === 'object')
		exports["service-already-running"] = factory();
	else
		root["service-already-running"] = factory();
})(global, function() {
return /******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ "child_process":
/*!********************************!*\
  !*** external "child_process" ***!
  \********************************/
/***/ ((module) => {

module.exports = require("child_process");

/***/ }),

/***/ "node:child_process":
/*!*************************************!*\
  !*** external "node:child_process" ***!
  \*************************************/
/***/ ((module) => {

module.exports = require("node:child_process");

/***/ }),

/***/ "node:path":
/*!****************************!*\
  !*** external "node:path" ***!
  \****************************/
/***/ ((module) => {

module.exports = require("node:path");

/***/ }),

/***/ "node:process":
/*!*******************************!*\
  !*** external "node:process" ***!
  \*******************************/
/***/ ((module) => {

module.exports = require("node:process");

/***/ }),

/***/ "node:url":
/*!***************************!*\
  !*** external "node:url" ***!
  \***************************/
/***/ ((module) => {

module.exports = require("node:url");

/***/ }),

/***/ "node:util":
/*!****************************!*\
  !*** external "node:util" ***!
  \****************************/
/***/ ((module) => {

module.exports = require("node:util");

/***/ }),

/***/ "./node_modules/ps-list/index.js":
/*!***************************************!*\
  !*** ./node_modules/ps-list/index.js ***!
  \***************************************/
/***/ ((__unused_webpack___webpack_module__, __webpack_exports__, __webpack_require__) => {

__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "default": () => (__WEBPACK_DEFAULT_EXPORT__)
/* harmony export */ });
/* harmony import */ var node_process__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! node:process */ "node:process");
/* harmony import */ var node_util__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! node:util */ "node:util");
/* harmony import */ var node_path__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! node:path */ "node:path");
/* harmony import */ var node_url__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! node:url */ "node:url");
/* harmony import */ var node_child_process__WEBPACK_IMPORTED_MODULE_4__ = __webpack_require__(/*! node:child_process */ "node:child_process");






const __dirname = node_path__WEBPACK_IMPORTED_MODULE_2__.dirname((0,node_url__WEBPACK_IMPORTED_MODULE_3__.fileURLToPath)("file:///home/mjackson/projects/service-already-running/node_modules/ps-list/index.js"));

const TEN_MEGABYTES = 1000 * 1000 * 10;
const execFile = (0,node_util__WEBPACK_IMPORTED_MODULE_1__.promisify)(node_child_process__WEBPACK_IMPORTED_MODULE_4__.execFile);

const windows = async () => {
	// Source: https://github.com/MarkTiedemann/fastlist
	let binary;
	switch (node_process__WEBPACK_IMPORTED_MODULE_0__.arch) {
		case 'x64':
			binary = 'fastlist-0.3.0-x64.exe';
			break;
		case 'ia32':
			binary = 'fastlist-0.3.0-x86.exe';
			break;
		default:
			throw new Error(`Unsupported architecture: ${node_process__WEBPACK_IMPORTED_MODULE_0__.arch}`);
	}

	const binaryPath = node_path__WEBPACK_IMPORTED_MODULE_2__.join(__dirname, 'vendor', binary);
	const {stdout} = await execFile(binaryPath, {
		maxBuffer: TEN_MEGABYTES,
		windowsHide: true,
	});

	return stdout
		.trim()
		.split('\r\n')
		.map(line => line.split('\t'))
		.map(([pid, ppid, name]) => ({
			pid: Number.parseInt(pid, 10),
			ppid: Number.parseInt(ppid, 10),
			name,
		}));
};

const nonWindowsMultipleCalls = async (options = {}) => {
	const flags = (options.all === false ? '' : 'a') + 'wwxo';
	const returnValue = {};

	await Promise.all(['comm', 'args', 'ppid', 'uid', '%cpu', '%mem'].map(async cmd => {
		const {stdout} = await execFile('ps', [flags, `pid,${cmd}`], {maxBuffer: TEN_MEGABYTES});

		for (let line of stdout.trim().split('\n').slice(1)) {
			line = line.trim();
			const [pid] = line.split(' ', 1);
			const value = line.slice(pid.length + 1).trim();

			if (returnValue[pid] === undefined) {
				returnValue[pid] = {};
			}

			returnValue[pid][cmd] = value;
		}
	}));

	// Filter out inconsistencies as there might be race
	// issues due to differences in `ps` between the spawns
	return Object.entries(returnValue)
		.filter(([, value]) => value.comm && value.args && value.ppid && value.uid && value['%cpu'] && value['%mem'])
		.map(([key, value]) => ({
			pid: Number.parseInt(key, 10),
			name: node_path__WEBPACK_IMPORTED_MODULE_2__.basename(value.comm),
			cmd: value.args,
			ppid: Number.parseInt(value.ppid, 10),
			uid: Number.parseInt(value.uid, 10),
			cpu: Number.parseFloat(value['%cpu']),
			memory: Number.parseFloat(value['%mem']),
		}));
};

const ERROR_MESSAGE_PARSING_FAILED = 'ps output parsing failed';

const psFields = 'pid,ppid,uid,%cpu,%mem,comm,args';

const psOutputRegex = /^[ \t]*(?<pid>\d+)[ \t]+(?<ppid>\d+)[ \t]+(?<uid>\d+)[ \t]+(?<cpu>\d+\.\d+)[ \t]+(?<memory>\d+\.\d+)[ \t]+/;

const nonWindowsSingleCall = async (options = {}) => {
	const flags = options.all === false ? 'wwxo' : 'awwxo';

	const promise = execFile('ps', [flags, psFields], {maxBuffer: TEN_MEGABYTES});
	const {stdout} = await promise;
	const {pid: psPid} = promise.child;

	const lines = stdout.trim().split('\n');
	lines.shift();

	let psIndex;
	let commPosition;
	let argsPosition;

	const processes = lines.map((line, index) => {
		const match = psOutputRegex.exec(line);
		if (match === null) {
			throw new Error(ERROR_MESSAGE_PARSING_FAILED);
		}

		const {pid, ppid, uid, cpu, memory} = match.groups;

		const processInfo = {
			pid: Number.parseInt(pid, 10),
			ppid: Number.parseInt(ppid, 10),
			uid: Number.parseInt(uid, 10),
			cpu: Number.parseFloat(cpu),
			memory: Number.parseFloat(memory),
			name: undefined,
			cmd: undefined,
		};

		if (processInfo.pid === psPid) {
			psIndex = index;
			commPosition = line.indexOf('ps', match[0].length);
			argsPosition = line.indexOf('ps', commPosition + 2);
		}

		return processInfo;
	});

	if (psIndex === undefined || commPosition === -1 || argsPosition === -1) {
		throw new Error(ERROR_MESSAGE_PARSING_FAILED);
	}

	const commLength = argsPosition - commPosition;
	for (const [index, line] of lines.entries()) {
		processes[index].name = line.slice(commPosition, commPosition + commLength).trim();
		processes[index].cmd = line.slice(argsPosition).trim();
	}

	processes.splice(psIndex, 1);
	return processes;
};

const nonWindows = async (options = {}) => {
	try {
		return await nonWindowsSingleCall(options);
	} catch { // If the error is not a parsing error, it should manifest itself in multicall version too.
		return nonWindowsMultipleCalls(options);
	}
};

const psList = node_process__WEBPACK_IMPORTED_MODULE_0__.platform === 'win32' ? windows : nonWindows;

/* harmony default export */ const __WEBPACK_DEFAULT_EXPORT__ = (psList);


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
(() => {
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
__webpack_require__.r(__webpack_exports__);
/* harmony export */ __webpack_require__.d(__webpack_exports__, {
/* harmony export */   "scanForSame": () => (/* binding */ scanForSame),
/* harmony export */   "killOthers": () => (/* binding */ killOthers),
/* harmony export */   "listAll": () => (/* binding */ listAll)
/* harmony export */ });
/* harmony import */ var child_process__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! child_process */ "child_process");
/* harmony import */ var child_process__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(child_process__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var ps_list__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ps-list */ "./node_modules/ps-list/index.js");




// ----------------------------------------------------------------------------
function exec(command) {
  return new Promise(function(resolve, reject) {
      child_process__WEBPACK_IMPORTED_MODULE_0___default().exec(command, (error, stdout, stderr) => {
          if (error) {
              reject(error);
              return;
          }

          resolve(stdout.trim());
      });
  });
}

// ----------------------------------------------------------------------------
const pwdx = async (pid) => {

  if (process.platform != 'linux') {
    throw new Error("Non-linux OS not supported. (need pwdx)")
  }

  const line = await exec('pwdx '+pid);
  const value = line.slice(line.indexOf(': ')+2).trim()
  
  return value

};

// ----------------------------------------------------------------------------
function has(str, arr) {
  return arr.some(word => str.includes(word))
}

//  const systemCmds = ['chrome', 'vscode', '/code', 'libexec', 'kthread', 'kworker', 'fusermount']
// var b = a.filter(o => ( !has(o.cmd, systemCmds) && o.cmd.includes('node')))

// ----------------------------------------------------------------------------
const scanForSame = async () => {

  const a = await (0,ps_list__WEBPACK_IMPORTED_MODULE_1__["default"])();                          // List all processes alive
  const me = a.filter(o => o.pid === process.pid)[0]
  const others = a.filter(o => (o.cmd == me.cmd) )

  const unresolvedPromises = others.map(async o => {
      const wDir = await pwdx(o.pid)
      return {pid: o.pid, cmd: o.cmd, cwd: wDir}
    });
  const results = await Promise.all(unresolvedPromises);

  return results
}

// ----------------------------------------------------------------------------
const killOthers = async () => {

  const all = await scanForSame()

  all.forEach(o => {
    const thisGuy = (o.pid === process.pid) 

    if (!thisGuy) {
      console.log('KILLING:', o.pid, o.cmd, o.cwd)
      process.kill(o.pid)
    }

  })
}

// ----------------------------------------------------------------------------
const listAll = async () => {

  const all = await scanForSame()

  all.forEach(o => {
    const thisGuy = (o.pid === process.pid) ? '              <<< This program' : ''

    console.log(o.pid, o.cmd, o.cwd, thisGuy)
  })
}

// listAll()


/*
process.versions.node    '16.14.0',
process.platform         'linux',
process.env.*

process.argv

'comm', 'args', 'ppid', 'uid', '%cpu', '%mem'
ps wwxo pid,args
*/
})();

/******/ 	return __webpack_exports__;
/******/ })()
;
});
//# sourceMappingURL=index.js.map