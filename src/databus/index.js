(function (global, factory) {
  /* CommonJS */
  if (typeof require === 'function' && typeof module === "object" && module && module["exports"])
    module['exports'] = (function () {
      return factory(require('./cbusCore'), require('./cbusCommand'));
    })();
  /* Global */
  else
    global["cbus"] = factory(global.CBusCore, global.cbusCommand);
})(this, function (CBusCore, cbusCommand) {
  const CmdParse = function () {
    this.commandCache = {}
  }
  const cmdParse = new CmdParse();

  class AppClient {
    constructor() {
      this._cbusCore = new CBusCore()
      this._cmdParse = cmdParse
      this._wsurlList = []
      this._lastConnectUrl = ''
      this._subscribeList = []
      this._publishCallback = null
      this._subIdStart = 123
      this._clientName = 'test'
      this._heartBeatTimer = 0
      this._hearBeatIntervalSecond = 5 // 心跳间隔5秒
      this._sendqueue = 0
      this._receivequeue = 0
      this._event = {
        onConnectSuccess: () => {},
        onConnectClose: () => {},
        onConnectError: () => {}
      }
      this.setResponseTimeoutSecond()
    }

    /**
     * 设置客户端名称，作为登录的信息
     * 
     * @param {string} name 
     * @memberof AppClient
     */
    setClientName(name) {
      this._clientName = name
    }

    /**
     * 设置心跳间隔时间秒数
     * 
     * @param {number} second 
     * @memberof AppClient
     */
    setHeartBeatIntervalSecond(second) {
      this._hearBeatIntervalSecond = second
    }

    /**
     * 设置proto文件所在目录，默认在同级目录下的protobuf目录
     * 
     * @param {string} dir 
     * @memberof AppClient
     */
    setProtoFileDir(dir) {
      this._cbusCore.setProtoFileDir(dir)
    }

    /**
     * react native需要将proto文件转换为json给protobufjs使用（非react native不需要调用此接口）
     * 
     * @param {array} jsonObjList [{name: name, json: require('./protobuf/msgexpress.json')}]
     * @memberof AppClient
     */
    initProtoJson(jsonObjList) {
      jsonObjList.forEach(item => {
        if (item.name && item.json) {
          this._cbusCore.addProtoBuilder(item.name, item.json)
        }
      })
    }

    /**
     * 设置应答超时
     * 
     * @param {number} [second=10] 
     * @memberof AppClient
     */
    setResponseTimeoutSecond(second = 10) {
      this._cbusCore.setResponseTimeoutSecond(second);
    }

    /**
     * 设置网络事件回调
     * 
     * @param {() => {})} onopen 网络连接成功回调
     * @param {(event) => {})} onclose 网络关闭回调
     * @param {(event) => {})} onerror 网络出错回调
     * @memberof AppClient
     */
    setEvent(onopen, onclose, onerror) {
      if (onopen && typeof onopen !== 'function') {
        throw new TypeError('onopen must be a function');
      }
      if (onclose && typeof onclose !== 'function') {
        throw new TypeError('onclose must be a function');
      }
      if (onerror && typeof onerror !== 'function') {
        throw new TypeError('onerror must be a function');
      }
      this._event.onConnectSuccess = onopen;
      this._event.onConnectClose = onclose;
      this._event.onConnectError = onerror;
    }

    /**
     * 设置推送回调
     * 
     * @param {function} onpublish = function({ topic: '', request: '', response: '', old: false, content: {}}) {}
     * @memberof AppClient
     */
    setPublish(onpublish) {
      if (typeof onpublish !== 'function') {
        throw new TypeError('onpublish must be a function');
      }
      this._publishCallback = onpublish;
    }

    /**
     * 创建一个新的对象
     * 
     * @returns 
     * @memberof AppClient
     */
    newBus() {
      return new AppClient();
    }

    /**
     * 打开连接，登录总线，使用多个IP进行尝试，如果都失败才返回失败
     * 
     * @param {string} wsip 地址
     * @param {string | number} wsport 端口
     * @param {string} [wspath=''] 路径
     * @returns Promise
     * @memberof AppClient
     */
    open(wsurl, subcribeList) {
      const self = this;
      this._wsurlList = isArray(wsurl) ? wsurl : [wsurl];
      this._subscribeList = subcribeList || [];

      const go = () => {
        return new Promise((resolve, reject) => {
          this._cbusCore.connect(this.pickUrl(), {
            onConnectSuccess: function () {
              self._cbusCore.setConnectOptions(self._event);
              self._event.onConnectSuccess();
              self._cbusCore.setPushDataFactory(function (topic, content) {
                self.dispatchPublishMessage(topic, content)
              });
              self.loginBus().then((json) => {
                  if (self._subscribeList.length === 0) {
                    return resolve(json);
                  } else {
                    self.subscribe(self._subscribeList).then(json => {
                      if (json.retcode === 0) {
                        return resolve(json);
                      }
                      return reject((json.msg && json.msg.length) ? json.msg : 'subscribe failed');
                    }).catch(err => {
                      return reject(err);
                    })
                  }
                })
                .catch((err) => {
                  return reject(err)
                })
            },
            onConnectError: function (err) {
              self._cbusCore.setConnectOptions(self._event);
              self._event.onConnectError(err);
              return reject(err);
            },
            onConnectClose: function (err) {
              self._cbusCore.setConnectOptions(self._event);
              self._event.onConnectClose(err);
              return reject(err);
            }
          })
        })
      }

      const loop = (failedCount, failedMsg) => {
        self._cbusCore.close();
        if (failedCount === self._wsurlList.length) {
          return Promise.reject(failedMsg);
        } else {
          return go().then(() => {
            self.startHeartBeat();
            return Promise.resolve('success');
          }).catch((msg) => {
            return loop(++failedCount, msg);
          })
        }
      }
      return loop(0);
    }

    /**
     * 获取网络连接状态
     * 
     * @returns number 0(CONNECTING), 1(OPEN）, 2(CLOSING), 3(CLOSED)
     * @memberof AppClient
     */
    readyState() {
      return this._cbusCore.readyState()
    }

    /**
     * 关闭心跳和连接
     * 
     * @memberof AppClient
     */
    close() {
      this.closeHeartBeat()
      this._cbusCore.close()
    }

    /**
     * 登录总线，open成功后会自动登录，一般情况下用户不需要调用
     * 
     * @returns promise MsgExpress.LoginResponse
     * @memberof AppClient
     */
    loginBus() {
      const loginData = {
        type: 1,
        name: this._clientName,
        group: 1,
        uuid: guid(),
        starttime: new Date().getTime(),
        auth: 'test'
      }
      console.log('login info', loginData);
      return this.post('MsgExpress.LoginInfo', 'MsgExpress.LoginResponse', loginData)
    }

    /**
     * 批量订阅，支持新旧两种方式
     * 
     * @param {array} protoList 请求和应答用逗号分隔，number表示老的订阅方式，['Trade.Trade, MsgExpress.CommonResponse', 267386881]
     * @param {(data) => {}} publishCallback data={topic: string, request: string, response: string, old: bool, content: jsonObject}
     * @returns promise MsgExpress.CommonResponse
     * @memberof AppClient
     */
    subscribe(protoList) {
      return this._cbusCore.buildProtoObject("msgexpress", "MsgExpress.SubscribeData").then(obj => {
        const objList = [];
        for (let i = 0, count = protoList.length; i < count; i++) {
          let cmd = 0;
          if (isNaN(protoList[i])) {
            // proto中的协议名，新的订阅方式，如：StockServer.StockDataRequest, StockServer.StockDataResponse
            const arr = protoList[i].split(',');
            if (arr.length === 2) {
              cmd = this._cmdParse.getCommandFromProto(arr[0].trim(), arr[1].trim());
            } else {
              console.error('subscribe params error', protoList[i]);
            }
          } else {
            // Number老的订阅方式，如：267386881
            cmd = protoList[i];
          }
          if (cmd) {
            const newObj = JSON.parse(JSON.stringify(obj));
            newObj.subid = this._subIdStart++;
            newObj.topic = cmd;
            objList.push(newObj);
          }
        }
        return this.post("MsgExpress.ComplexSubscribeData", "MsgExpress.CommonResponse", {
          sub: objList
        })
      })
    }

    /**
     * 解析老的方式推送的消息
     * 
     * @param {string} protoFilename proto的名字
     * @param {object} jsonContent 老的方式推送的消息
     * @returns promise protobuf解析后的消息
     * @memberof AppClient
     */
    parseOldPublishMessage(protoFilename, jsonContent) {
      // const msgExpress = {
      //   KEY_UUID: 1,KEY_AUTH: 2,KEY_ADDR: 3,KEY_NAME: 4,KEY_TYPE: 5,KEY_GROUP: 6,
      //   KEY_IP: 7,KEY_STARTTIME: 8,KEY_LOGINTIME: 9,KEY_SERVICE: 10,KEY_HBTIME: 20,
      //   KEY_CPU: 21,KEY_TOPMEM: 22,KEY_MEM: 23,KEY_CSQUEUE: 24,KEY_CRQUEUE: 25,
      //   KEY_QUEUELENGTH: 29,KEY_RECVREQUEST: 30,KEY_SENTREQUEST: 31,KEY_RECVRESPONSE: 32,
      //   KEY_SENTRESPONSE: 33,KEY_RECVPUBLISH: 34,KEY_SENTPUBLISH: 35,KEY_RECVREQUESTB: 36,
      //   KEY_SENTREQUESTB: 37,KEY_RECVRESPONSEB: 38,KEY_SENTRESPONSEB: 39,KEY_RECVPUBLISHB: 40,
      //   KEY_SENTPUBLISHB: 41,KEY_LOGLEVEL: 61,KEY_LOGDATA: 62, KEY_TIME: 11 ,KEY_BROKER:12
      // };
      return new Promise((resolve, reject) => {
        if (jsonContent.length < 2) {
          return reject('json content error')
        }

        const name = jsonContent[0].value
        const content = jsonContent[1].value
        const arr = content.split(',')
        var bb = new Uint8Array(arr.length)
        for (let i = 0, count = arr.length; i < count; i++) {
          bb[i] = arr[i]
        }

        this._cbusCore.buildProtoObject(protoFilename, name)
          .then((Msg) => {
            try {
              const decodedMsg = Msg.decode(bb)
              return resolve(decodedMsg)
            } catch (e) {
              return reject(e)
            }
          })
      })
    }

    /**
     * 发送消息
     * 
     * @param {string} protoRequest 请求协议名
     * @param {string} protoResponse 应答协议名
     * @param {object} requestObj 请求传入的数据，结构对应请求的协议名
     * @returns promise protoResponse对应的结构
     * @memberof AppClient
     */
    post(protoRequest, protoResponse, requestObj) {
      return this.postProto(this._cmdParse.getProtoFilename(protoRequest), protoRequest, protoResponse, requestObj)
    }

    /**
     * 发送消息，指定对应的proto文件名
     * 
     * @param {any} protoFilename proto文件名
     * @param {any} protoRequest 请求协议名
     * @param {any} protoResponse 应答协议名
     * @param {any} requestObj 请求传入的数据，结构对应请求的协议名
     * @returns promise protoResponse对应的结构
     * @memberof AppClient
     */
    postProto(protoFilename, protoRequest, protoResponse, requestObj) {
      const self = this;
      return new Promise((resolve, reject) => {
        const cmd = this._cmdParse.getCommandFromProto(protoRequest, protoResponse)
        if (!cmd) {
          console.error('command error, request:' + protoRequest + ', response:' + protoResponse)
          return reject('command error, request:' + protoRequest + ', response:' + protoResponse)
        }

        ++self._sendqueue;
        //console.log('postProto cmd:' + cmd + ', file:' + protoFilename + ', request:' + protoRequest + ', response:' + protoRequest)
        this._cbusCore.requestOnce(cmd, protoFilename, protoRequest, protoResponse, {
          fillRequest: function (request) {
            Object.assign(request, requestObj)
          },
          handleResponse: function (response) {
            ++self._receivequeue;
            return resolve(response)
          },
          handlerError: function (err) {
            return reject(err)
          }
        }).catch(err => {
          console.log('request once error', err);
        });
      })
    }

    /**
     * 开启心跳，默认会开启，用户不需要调用
     * 
     * @memberof AppClient
     */
    startHeartBeat() {
      this.closeHeartBeat()

      let heartbeatFailedCount = 0;
      let isOpening = false;

      const handleHeartbeatError = () => {
        ++heartbeatFailedCount;
        console.log('heartbeat failed, count:' + heartbeatFailedCount + ', isOpening:' + isOpening);
        if (!isOpening && heartbeatFailedCount >= 3) {
          heartbeatFailedCount = 0;
          isOpening = true;
          this.open(this._wsurlList, this._subscribeList).then(() => {
            isOpening = false;
          }).catch(() => {
            isOpening = false;
          })
        }
      }

      this._heartBeatTimer = setInterval(() => {
        if (this.readyState() !== 1) {
          handleHeartbeatError('readystate is not open, readyState:' + this.readyState);
          return
        }

        const data = {
          cpu: 0,
          topmemory: 0,
          memory: 0,
          sendqueue: this._sendqueue,
          receivequeue: this._receivequeue
        }

        console.log('heartbeat', data);
        this.post("MsgExpress.HeartBeat", "MsgExpress.HeartBeatResponse", data).then(() => {
        }).catch((err) => {
          handleHeartbeatError(err);
        })
      }, this._hearBeatIntervalSecond * 1000)
    }

    /**
     * 关闭心跳
     * 
     * @memberof AppClient
     */
    closeHeartBeat() {
      if (this._heartBeatTimer) {
        clearInterval(this._heartBeatTimer)
      }
    }

    /**
     * 
     * 轮询挑选一个url 
     * @returns 
     * @memberof AppClient
     */
    pickUrl() {
      let newIndex = this._wsurlList.indexOf(this._lastConnectUrl) + 1;
      newIndex = (newIndex < this._wsurlList.length) ? newIndex : 0;
      this._lastConnectUrl = this._wsurlList[newIndex];
      return this._lastConnectUrl;
    }

    /**
     * 派发推送的消息，用户不需要调用
     * 
     * @param {string} topic 
     * @param {object} content 
     * @returns 
     * @memberof AppClient
     */
    dispatchPublishMessage(topic, content) {
      if (!this._publishCallback) {
        return;
      }

      const proto = this._cmdParse.getProtoFromCommand(topic)
      if (!proto || !content || !content.length) {
        console.log('get proto from command failed, topic:' + topic + ',content:' + content)
        return
      }

      const data = {}
      data.topic = topic;
      data.request = proto.request;
      data.response = proto.response;
      if (isArray(content)) {
        // 老协议，如果定义了proto可以调用appClient.parsePublishMessage解析，否则用户自己去根据key-value解析
        data.old = true;
        data.content = content;
        this._publishCallback(data);
      } else {
        data.old = false;
        return this._cbusCore.buildProtoObject(this._cmdParse.getProtoFilename(proto.request), proto.request).then(Msg => {
          try {
            data.content = Msg.decode(content)
            this._publishCallback(data);
          } catch (e) {
            console.log('dispatchPublishMessage', proto.request, e)
          }
        })
      }
    }
  }

  function isArray(obj) {
    return Object.prototype.toString.call(obj) === '[object Array]';
  }

  function guid() {
    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    }
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
  }

  CmdParse.prototype.getCommandFromProto = function (proto_request, proto_response) {
    proto_response = proto_response || 'MsgExpress.CommonResponse'
    const proto_str = proto_request + '-' + proto_response
    if (this.commandCache[proto_str]) {
      return this.commandCache[proto_str]
    }

    for (let i = 0, appCount = cbusCommand.AppList.length; i < appCount; i++) {
      const app = cbusCommand.AppList[i]
      const header = app['$']
      if (!header || !app['function']) {
        continue;
      }

      for (let j = 0, funcCount = app['function'].length; j < funcCount; j++) {
        const func = app['function'][j]
        const funcObj = func['$']
        if (funcObj) {
          if (funcObj.request === proto_request && funcObj.response === proto_response) {
            const val = (parseInt(header.id, 10) << 20) | parseInt(funcObj.id, 10)
            this.commandCache[proto_str] = val
            return val
          }
        }
      }
    }
    console.error('getCommandFromProto error, request:' + proto_response + ', response:' + proto_response)
    return 0
  }
  CmdParse.prototype.getProtoFromCommand = function (cmd) {
    const appId = cmd >> 20
    const funcId = (cmd - ((cmd >> 20) << 20))
    for (let i = 0, appCount = cbusCommand.AppList.length; i < appCount; i++) {
      const app = cbusCommand.AppList[i]
      const header = app['$']
      if (!header || !app['function']) {
        continue
      }

      if (parseInt(header.id, 10) !== appId) {
        continue
      }

      for (let j = 0, funcCount = app['function'].length; j < funcCount; j++) {
        const func = app['function'][j]
        const funcObj = func['$']
        if (funcObj) {
          if (parseInt(funcObj.id, 10) === funcId) {
            return {
              request: funcObj.request,
              response: funcObj.response
            }
          }
        }
      }
    }
    console.error('getProtoFromCommand error, cmd:' + cmd)
    return 0;
  }
  CmdParse.prototype.getProtoFilename = function (proto) {
    const prefix = proto.substring(0, proto.indexOf('.'))
    for (let file of cbusCommand.ProtoFileList) {
      if (file.package === prefix) {
        return file.filename
      }
    }
    console.error('get proto filename error, proto:' + proto)
    return ''
  }

  return new AppClient();
});