const inputs = {
    search: document.getElementById('search'),
    name: document.getElementById('name')
}

const buttons = {
    editor: document.getElementById('newScript'),
    run: document.getElementById('run'),
    close: document.getElementById('close'),
    save: document.getElementById('save'),
}

const editor = CodeMirror.fromTextArea(document.getElementById('code'), {
    mode: "javascript",
    theme: "base16-dark",
    gutters: ["CodeMirror-lint-markers"],
    lint: true,
    lineNumbers: true,
});

const [editorSlide] = document.getElementsByClassName('slide')
const scriptList =  document.getElementById('script-list');

const scriptRunner = new ScriptRunner(editor, editorSlide, inputs, buttons, scriptList)

scriptRunner.init().then(() => {
    scriptRunner.render()
})
