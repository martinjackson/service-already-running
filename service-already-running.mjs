
import child from 'child_process'
import psList from 'ps-list'

// ----------------------------------------------------------------------------
function exec(command) {
  return new Promise(function(resolve, reject) {
      child.exec(command, (error, stdout, stderr) => {
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
export const scanForSame = async () => {

  const a = await psList();                          // List all processes alive
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
export const killOthers = async () => {

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
export const listAll = async () => {

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