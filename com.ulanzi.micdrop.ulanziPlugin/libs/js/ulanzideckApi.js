/// <reference path="eventEmitter.js"/>
/// <reference path="utils.js"/>


class UlanziStreamDeck  {

  constructor(){
    this.key = '';
    this.uuid = '';
    this.actionid = '';
    this.websocket = null;
    this.language = 'en';
    this.localization = null;
    this.on = EventEmitter.on;
    this.emit = EventEmitter.emit;
    this.isMain = false;
  }
  



  connect(uuid) {

    this.port = Utils.getQueryParams('port') || 3906;
    this.address = Utils.getQueryParams('address') || '127.0.0.1';
    this.actionid = Utils.getQueryParams('actionId') || ''; 
    this.key = Utils.getQueryParams('key') || ''; 
    this.language = Utils.getQueryParams('language') || Utils.getLanguage() || 'en';
    this.language = Utils.adaptLanguage(this.language) ; 
    this.uuid =  Utils.getQueryParams('uuid') || uuid;

    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }

    const isMain = this.uuid.split('.').length == 4;
    this.isMain = isMain;

    
    Utils.log('[ULANZIDECK] '+this.isMain?'MAIN':'CLIENT'+' WEBSOCKET CONNECT:',this.uuid)
    this.websocket = new WebSocket(`ws://${this.address}:${this.port}`);

    this.websocket.onopen = () => {
      Utils.log('[ULANZIDECK] '+this.isMain?'MAIN':'CLIENT'+' WEBSOCKET OPEN:', this.uuid);
      const json = {
        code: 0,
        cmd: Events.CONNECTED,
        actionid:this.actionid,
        key:this.key,
        uuid:this.uuid
      };

      this.websocket.send(JSON.stringify(json));

      this.emit(Events.CONNECTED, {});

      if (!isMain) {
        this.localizeUI();
      }
    };

    this.websocket.onerror = (evt) => {
      const error = `[ULANZIDECK] ${this.isMain?'MAIN':'CLIENT'} WEBSOCKET ERROR: ${evt}, ${evt.data}, ${SocketErrors['DEFAULT']}`;
      Utils.warn(error);
      this.emit(Events.ERROR, error);
    };

    this.websocket.onclose = (evt) => {
      Utils.warn('[ULANZIDECK] '+this.isMain?'MAIN':'CLIENT'+' WEBSOCKET CLOSED:', SocketErrors['DEFAULT']);
      this.emit(Events.CLOSE);
    };

    this.websocket.onmessage = (evt) => {
      Utils.log('[ULANZIDECK] '+this.isMain?'MAIN':'CLIENT'+' WEBSOCKET MESSGE ');

      const data = evt && evt.data ? JSON.parse(evt.data) : null;


      Utils.log('[ULANZIDECK] '+this.isMain?'MAIN':'CLIENT'+' WEBSOCKET MESSGE DATA:', JSON.stringify(data));


      if (!data || (typeof data.code !== 'undefined' && data.cmdType !== 'REQUEST')) return;



      Utils.log('[ULANZIDECK] '+this.isMain?'MAIN':'CLIENT'+' WEBSOCKET MESSGE IN');

      if (!this.key && data.uuid == this.uuid && data.key) {
        this.key = data.key
      }
      if(!this.actionid && data.uuid == this.uuid && data.actionid){
        this.actionid = data.actionid
      }

      if (isMain) {
        this.send(data.cmd, {
          code: 0,
          ...data
        })
      }

      if(data.cmd == 'clear'){
        if(data.param){
          for(let i = 0; i<data.param.length; i++){
            const context = this.encodeContext(data.param[i])
            data.param[i].context = context
          }
        }
      }else{
        const context = this.encodeContext(data)
        data.context = context
      }

      this.emit(data.cmd, data)
    };
  }

  async localizeUI() {
    const el = document.querySelector('.udpi-wrapper');
    if (!el) return Utils.warn("No element found to localize");

    // this.language = Utils.getLanguage() || 'en';
    if (!this.localization) {
      try {
        const localJson = await Utils.readJson(`${Utils.getPluginPath()}/${this.language}.json`)
        this.localization = localJson['Localization'] ? localJson['Localization'] : null
      } catch (e) {
        Utils.log(`${Utils.getPluginPath()}/${this.language}.json`)
        Utils.warn("No FILE found to localize " + this.language);
      }
    }
    if (!this.localization) return;

    const selectorsList = '[data-localize]';
    el.querySelectorAll(selectorsList).forEach(e => {

      const s = e.innerText.trim();
      let dl = e.dataset.localize;
      
      if (e.placeholder && e.placeholder.length) {
        // console.log('e.placeholder:',e.placeholder)
        e.placeholder = this.localization[ dl ? dl : e.placeholder] || e.placeholder;
      }
      if (e.title && e.title.length) {
        // console.log('e.title:',e.title)
        e.title = this.localization[dl ? dl : e.title] || e.title;
      }
      if(e.label){
        // console.log('e.label:',e.label)
          e.label = this.localization[dl ? dl : e.label] || e.label;
      }
      if(e.textContent){
        // console.log('e.textContent:',e.textContent)
          e.textContent = this.localization[dl ? dl : e.textContent] || e.textContent;
      }
      
      if(s){
        // console.log('s:',s)
        e.innerHTML = this.localization[dl ? dl : s] || e.innerHTML;
      }

    });
  };

  t(key){
    return this.localization && this.localization[key] || key
  }

  encodeContext(jsn) {
    return jsn.uuid + '___' + jsn.key + '___' + jsn.actionid
  }

  decodeContext(context) {
    const de_ctx = context.split('___')
    return {
      uuid: de_ctx[0],
      key: de_ctx[1],
      actionid: de_ctx[2]
    }
  }

  /**
   * Send JSON params to StreamDeck
   * @param {string} cmd
   * @param {object} params
   */
  send(cmd, params) {
    this.websocket && this.websocket.send(JSON.stringify({
      cmd,
      uuid: this.uuid,
      key: this.key,
      actionid: this.actionid,
      ...params
    }));
  }

  sendParamFromPlugin(settings, context) {
    const { uuid, key, actionid } = context ? this.decodeContext(context) : {}
    this.send(Events.PARAMFROMPLUGIN, {
      uuid: uuid || this.uuid,
      key: key || this.key,
      actionid: actionid || this.actionid,
      param: settings
    })
  }

  openUrl(url, local, param) {
    this.send(Events.OPENURL, {
      url,
      local: local ? true : false,
      param: param ? param : null
    })
  }

  openView(url, width = 200, height = 200, x, y, param) {
    const params = {
      url,
      width,
      height
    }
    if(x){
      params.x = x
    }
    if(y){
      params.y = y
    }
    if(param){
      params.param = param
    }
    this.send(Events.OPENVIEW, params)
  }

  toast(msg) {
    this.send(Events.TOAST, {
      msg
    })
  }

  selectFileDialog(filter) {
    this.send(Events.SELECTDIALOG, {
      type: 'file',
      filter
    })
  }

  selectFolderDialog() {
    this.send(Events.SELECTDIALOG, {
      type: 'folder'
    })
  }

  setStateIcon(context, state, text) {
    const { uuid, key, actionid } = this.decodeContext(context)
    this.send(Events.STATE, {
      param: {
        statelist: [{
          uuid,
          key,
          actionid,
          type: 0,
          state,
          textData: text || '',
          showtext: text ? true : false
        }]
      }
    })
  }

  setBaseDataIcon(context, data, text) {
    const { uuid, key, actionid } = this.decodeContext(context)
    this.send(Events.STATE, {
      param: {
        statelist: [{
          uuid,
          key,
          actionid,
          type: 1,
          data,
          textData: text || '',
          showtext: text ? true : false
        }]
      }
    })
  }

  setPathIcon(context, path, text) {
    const { uuid, key, actionid } = this.decodeContext(context)
    this.send(Events.STATE, {
      param: {
        statelist: [{
          uuid,
          key,
          actionid,
          type: 2,
          path,
          textData: text || '',
          showtext: text ? true : false
        }]
      }
    })
  }

  setGifDataIcon(context, gifdata, text) {
    const { uuid, key, actionid } = this.decodeContext(context)
    this.send(Events.STATE, {
      param: {
        statelist: [{
          uuid,
          key,
          actionid,
          type: 3,
          gifdata,
          textData: text || '',
          showtext: text ? true : false
        }]
      }
    })
  }

  setGifPathIcon(context, gifpath, text) {
    const { uuid, key, actionid } = this.decodeContext(context)
    this.send(Events.STATE, {
      param: {
        statelist: [{
          uuid,
          key,
          actionid,
          type: 4,
          gifpath,
          textData: text || '',
          showtext: text ? true : false
        }]
      }
    })
  }

  onConnected(fn) {
    if (!fn) {
      Utils.error(
        'A callback function for the connected event is required for onConnected.'
      );
    }

    this.on(Events.CONNECTED, (jsn) => fn(jsn));
    return this;
  }

  onClose(fn) {
    if (!fn) {
      Utils.error(
        'A callback function for the close event is required for onClose.'
      );
    }

    this.on(Events.CLOSE, (jsn) => fn(jsn));
    return this;
  }

  onError(fn) {
    if (!fn) {
      Utils.error(
        'A callback function for the error event is required for onError.'
      );
    }

    this.on(Events.ERROR, (jsn) => fn(jsn));
    return this;
  }

  onAdd(fn) {
    if (!fn) {
      Utils.error(
        'A callback function for the add event is required for onAdd.'
      );
    }

    this.on(Events.ADD, (jsn) => fn(jsn));
    return this;
  }

  onParamFromApp(fn) {
    if (!fn) {
      Utils.error(
        'A callback function for the paramfromapp event is required for onParamFromApp.'
      );
    }

    this.on(Events.PARAMFROMAPP, (jsn) => fn(jsn));
    return this;
  }


  onParamFromPlugin(fn) {
    if (!fn) {
      Utils.error(
        'A callback function for the paramfromplugin event is required for onParamFromPlugin.'
      );
    }

    this.on(Events.PARAMFROMPLUGIN, (jsn) => fn(jsn));
    return this;
  }

  onRun(fn) {
    if (!fn) {
      Utils.error(
        'A callback function for the run event is required for onRun.'
      );
    }

    this.on(Events.RUN, (jsn) => fn(jsn));
    return this;
  }

  onSetActive(fn) {
    if (!fn) {
      Utils.error(
        'A callback function for the setactive event is required for onSetActive.'
      );
    }

    this.on(Events.SETACTIVE, (jsn) => fn(jsn));
    return this;
  }

  onClear(fn) {
    if (!fn) {
      Utils.error(
        'A callback function for the clear event is required for onClear.'
      );
    }

    this.on(Events.CLEAR, (jsn) => fn(jsn));
    return this;
  }

  onSelectdialog(fn) {
    if (!fn) {
      Utils.error(
        'A callback function for the selectdialog event is required for onSelectdialog.'
      );
    }

    this.on(Events.SELECTDIALOG, (jsn) => fn(jsn));
    return this;
  }


}


const $UD = new UlanziStreamDeck();
