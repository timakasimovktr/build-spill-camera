const { print } = require("pdf-to-printer");

const { ipcMain } = require("electron");

const electron = require("electron");
const app = electron.app;
const BrowserWindow = electron.BrowserWindow;

const os = require("os");
const fs = require("fs");
const path = require("path");
const isDev = require("electron-is-dev");

let mainWindow;
let workerWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    fullscreen: true,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadURL(
    isDev
      ? "http://localhost:3000"
      : `file://${path.join(__dirname, "../build/index.html")}`
  );

  mainWindow.on("closed", function () {
    workerWindow = undefined;
    mainWindow = undefined;
    app.quit();
  });

  workerWindow = new BrowserWindow({
    width: 302,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  workerWindow.loadURL("file://" + __dirname + "/worker.html");
}

// retransmit it to workerWindow
ipcMain.on("printPDF", (even, content) => {
  workerWindow.webContents.send("printPDF", content);
});

// when worker window is ready
ipcMain.on("readyToPrintPDF", (event) => {
  const pdfPath = path.join(os.tmpdir(), "print.pdf");
  workerWindow.webContents
    .printToPDF({
      pageSize: { width: 3.14961, height: 7 },
      margins: { marginType: "none", bottom: 0, left: 0, top: 0, right: 0 },
    })
    .then((data) => {
      fs.writeFile(pdfPath, data, function (error) {
        if (error) {
          throw error;
        }
        print(pdfPath).then(console.log);
        event.sender.send("wrote-pdf", pdfPath);
      });
    })
    .catch((error) => {
      throw error;
    });
});

app.on("ready", createWindow);

app.on("activate", function () {
  if (mainWindow === null) {
    createWindow();
  }
});
