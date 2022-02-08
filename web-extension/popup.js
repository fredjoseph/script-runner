const inputs = {
    search: document.getElementById('search'),
    name: document.getElementById('name'),
    requiresJQuery: document.getElementById('requiresJQuery'),
    import: document.getElementById('import-input'),
}

const buttons = {
    editor: document.getElementById('newScript'),
    run: document.getElementById('run'),
    close: document.getElementById('close'),
    save: document.getElementById('save'),
    export: document.getElementById('export'),
    import: document.getElementById('import'),
}

const editor = CodeMirror.fromTextArea(document.getElementById('code'), {
    mode: "javascript",
    theme: "darcula",
    gutters: ["CodeMirror-lint-markers"],
    lint: true,
    lineNumbers: true,
});

const [editorSlide] = document.getElementsByClassName('slide')
const scriptList = document.getElementById('script-list');

(async () => {
    await loadJQuery();
})();

function loadJQuery() {
    new Promise((resolve, _reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open('GET', "https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js");
        xhr.onload = () => {
            chrome.storage.local.set({ JQuery: `${xhr.responseText}` }, () => { resolve(true) });
        }

        xhr.send();
    })
}

const scriptRunner = new ScriptRunner(editor, editorSlide, inputs, buttons, scriptList)

scriptRunner.init().then(() => {
    scriptRunner.render()
})
