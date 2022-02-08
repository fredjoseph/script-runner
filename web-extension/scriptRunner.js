class Script {
    constructor(props) {
        this.code = props.code;
        this.title = props.title;
        this.id = props.id;
        this.options = props.options;
    }

    update(code, title, options) {
        this.code = code;
        this.title = title;
        this.options = options;
    }

    get html() {
        return `
             <li class="script">
                  <span class="script--title">
                      ${this.title}
                  </span>
                  <div class="script-actions">
                        <button class="btn btn-small exec" action="run" script-id="${this.id}">
                            <img class="img img--exec" src="assets/run.svg" alt="exec">
                        </button>
                        <button class="btn btn-small open" action="edit" script-id="${this.id}">
                            <img class="img img--open" src="assets/editor.svg" alt="open">
                        </button>
                        <button class="btn btn-small delete" action="delete" script-id="${this.id}">
                            <img class="img img--open" src="assets/delete.svg" alt="delete">
                        </button>
                  </div>
            </li>
        `
    }
}

class ScriptRunner {
    selectedScriptId = null;
    scripts = [];

    constructor(editor, editorSlide, inputs, buttons, scriptList) {
        this.editor = editor
        this.editorSlide = editorSlide
        this.buttons = buttons
        this.inputs = inputs
        this.storage = chrome.storage.sync;
        this.scriptList = scriptList;
        this.listen()
    }

    listen() {
        this.buttons.editor.addEventListener('click', async () => {
            await this.openEmptyEditor()
        })

        this.buttons.close.addEventListener('click', async () => {
            await this.closeEditor()
        })

        this.buttons.save.addEventListener('click', async () => {
            await this.saveScript(this.editor.getValue(), this.inputs.name.value, this.getCurrentScriptOptions());
        })

        this.buttons.run.addEventListener('click', () => {
            this.executeCode(this.editor.getValue(), this.getCurrentScriptOptions());
        })

        this.inputs.name.addEventListener('keyup', debounce(async () => {
            await this.updateState();
        }, 500))

        this.editor.on('change', debounce(async () => {
            await this.updateState();
        }, 500))

        this.inputs.search.addEventListener('keyup', e => {
            const val = inputs.search.value;
            let temp = [...this.scripts];
            if (val) {
                temp = temp.filter(script => val.split(' ').every(part =>
                    script.title.toLowerCase().includes(part.toLowerCase())))
            }
            this.render(temp);
            if (e.key === 'Enter' && temp.length) {
                this.executeCode(temp[0].code, temp[0].options);
            }
        })

        this.buttons.export.addEventListener('click', async () => {
            this.storage.get(['scripts'], function (items) {
                const result = JSON.stringify(items);

                // Save as file
                var url = 'data:application/json;base64,' + btoa(result);
                chrome.downloads.download({
                    url: url,
                    filename: 'script-runner.json'
                });
            });
        });

        this.buttons.import.addEventListener('click', async () => {
            this.inputs.import.click();
        });

        this.inputs.import.addEventListener('change', async () => {
            return new Promise((resolve, _reject) => {
                const fr = new FileReader();
                fr.onload = _ => resolve(fr.result);
                fr.readAsText(this.inputs.import.files[0]);
            }).then(content => {
                this.inputs.import.value = "";
                const scripts = JSON.parse(content).scripts;
                this.storage.set({ scripts }, () => {
                    this.scripts = scripts.map(s => new Script(s));
                    this.render();
                });
            })
        });
    }

    async init() {
        try {
            return new Promise(((resolve) => {
                chrome.storage.sync.get(['scripts', 'state'],
                    result => {
                        this.scripts = result.scripts.map(s => new Script(s))

                        if (!result.state.isList) {
                            this.selectedScriptId = result.state.selectedScriptId;
                            this.editorSlide.classList.add("active-slide")
                            this.inputs.name.value = result.state.editorData.title;
                            this.editor.getDoc().setValue(result.state.editorData.code)
                            this.restoreCurrentScriptOptions(result.state.editorData.options)
                        } else {
                            this.inputs.search.focus();
                        }
                        resolve(true)
                    }
                );
            }));
        } catch (e) {
            console.error(e)
        }
    }

    async updateState() {
        try {
            return new Promise(((resolve) => this.storage.set({
                state: {
                    isList: !this.editorSlide.classList.contains("active-slide"),
                    editorData: {
                        code: this.editor.getValue(),
                        title: this.inputs.name.value,
                        options: this.getCurrentScriptOptions(),
                    },
                    selectedScriptId: this.selectedScriptId
                },
                scripts: this.scripts
            }, () => {
                resolve(true)
            })));
        } catch (e) {
            console.error(e)
        }
    }

    async openEmptyEditor() {
        this.inputs.name.value = '';
        this.editor.getDoc().setValue('')
        this.restoreCurrentScriptOptions({ requiresJQuery: false })
        this.editorSlide.classList.add("active-slide")
        await this.updateState()
    }

    async closeEditor() {
        this.editorSlide.classList.remove("active-slide")
        this.selectedScriptId = null;
        await this.updateState()
    }

    async executeCode(code, options) {
        if (options.requiresJQuery) {
            await getObjectFromLocalStorage("JQuery").then(code => chrome.tabs.executeScript({ code }))
        }
        chrome.tabs.executeScript({ code });
    }

    async saveScript(code, title, options) {
        if (!!this.selectedScriptId) {
            const script = this.findScript(this.selectedScriptId)
            const index = this.scripts.findIndex(s => s.id === script.id)
            script.update(code, title, options)
            this.scripts.splice(index, 1, script)
        } else {
            this.scripts.splice(0, 0, new Script({ code, title, options, id: new Date().toISOString() }))
        }
        this.render()
        await this.closeEditor();
    }

    async deleteScript(id) {
        try {
            const index = this.scripts.findIndex(s => s.id === id)
            this.scripts.splice(index, 1)
            await new Promise(((resolve) => {
                this.storage.set({ scripts: this.scripts }, () => {
                    resolve(true)
                });
            }));

            this.render()
            await this.updateState()
        } catch (e) {
            console.error(e)
        }
    }

    async editScript(id) {
        const script = this.findScript(id)
        this.editor.getDoc().setValue(script.code)
        this.inputs.name.value = script.title;
        this.restoreCurrentScriptOptions(script.options);
        this.editorSlide.classList.add("active-slide")
        this.selectedScriptId = id;
        await this.updateState()
    }

    runScript(id) {
        const script = this.findScript(id);
        this.executeCode(script.code, script.options)
    }

    getCurrentScriptOptions() {
        return {
            requiresJQuery: this.inputs.requiresJQuery.checked,
        }
    }

    restoreCurrentScriptOptions(options) {
        this.inputs.requiresJQuery.checked = options.requiresJQuery;
    }

    findScript(id) {
        return this.scripts.find(s => s.id === id)
    }

    render(scripts) {
        this.scriptList.innerHTML = '';
        scripts = scripts || this.scripts

        scripts.forEach((script) => {
            this.scriptList.insertAdjacentHTML('afterbegin', script.html)
        })

        const actionButtons = [
            ...document.getElementsByClassName('open'),
            ...document.getElementsByClassName('exec'),
            ...document.getElementsByClassName('delete'),
        ]

        for (let button of actionButtons) {
            const id = button.getAttribute("script-id");
            const action = button.getAttribute("action")
            button.onclick = () => this[`${action}Script`](id)
        }
    }
}
