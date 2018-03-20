(function (global, factory) {
  /* CommonJS */
  if (typeof require === 'function' && typeof module === "object" && module && module["exports"])
    module['exports'] = (function () {
      return factory(require('./cbusCore'), require('./cbusCommand'));
    })();
  /* Global */
  else
    global["cbus"] = factory(global.cbusCore, global.cbusCommand);
})(this, function (databus, cbusCommand) {
  class AppClient {
    constructor(cmdParse) {
      this._cmdParse = cmdParse
      this._subscribeList = []
      this._publishCallback = null
      this._subIdStart = 123
      this._clientName = 'test'
      this._heartBeatTimer = 0
      this._hearBeatIntervalSecond = 5 // 心跳间隔5秒
      this._event = {
        onConnectSuccess: () => {},
        onConnectClose: () => {},
        onConnectError: () => {},
        onReconnect: () => {
          this.close();
          this.open(databus.getUrl(), this._subscribeList).then(json => {
            console.log('reconnect success', json);
          }).catch(err => {
            console.log('reconnect error', err);
          })
        }
      }
      this.setReconnectIntervalSecond()
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
     * 设置proto文件所在目录，默认在同级目录
     * 
     * @param {string} dir 
     * @memberof AppClient
     */
    setProtoFileDir(dir) {
      databus.setProtoFileDir(dir)
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
          databus.addProtoBuilder(item.name, item.json)
        }
      })
    }

    /**
     * 设置重连间隔秒数
     * 
     * @param {number} [second=5] 
     * @memberof AppClient
     */
    setReconnectIntervalSecond(second = 5) {
      databus.setReconnectIntervalSecond(second);
    }

    /**
     * 设置应答超时
     * 
     * @param {number} [second=10] 
     * @memberof AppClient
     */
    setResponseTimeoutSecond(second = 10) {
      databus.setResponseTimeoutSecond(second);
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
      this._publishCallback = onpublish;
    }

    /**
     * 打开连接，登录总线
     * 
     * @param {string} wsip 地址
     * @param {string | number} wsport 端口
     * @param {string} [wspath=''] 路径
     * @returns Promise
     * @memberof AppClient
     */
    open(wsurl, subcribeList) {
      const self = this
      this._subscribeList = subcribeList || [];
      
      return new Promise((resolve, reject) => {
        databus.connect(wsurl, {
          onConnectSuccess: function () {
            databus.setConnectOptions(self._event);
            self._event.onConnectSuccess();

            databus.setPushDataFactory(function (topic, content) {
              self.dispatchPublishMessage(topic, content)
            });
            self.startHeartBeat()
            self.loginBus().then((json) => {
              console.log('login bus success', json);
              if (self._subscribeList.length === 0) {
                return resolve(json);
              } else {
                self.subscribe(self._subscribeList).then(json => {
                  console.log('subscribe result', json);
                  if (json.retcode === 0) {
                    return resolve(json);
                  } else {
                    return reject(json);
                  }
                })
              }
            })
            .catch((err) => {
              return reject(err)
            })
          },
          onConnectError: function (err) {
            databus.setConnectOptions(self._event);
            self._event.onConnectError(err);
            return reject(err);
          },
          onConnectClose: function (err) {
            databus.setConnectOptions(self._event);
            self._event.onConnectClose(err);
            return reject(err);
          }
        })
      })
    }

    /**
     * 获取网络连接状态
     * 
     * @returns number 0(CONNECTING), 1(OPEN）, 2(CLOSING), 3(CLOSED)
     * @memberof AppClient
     */
    readyState() {
      return databus.readyState()
    }

    /**
     * 关闭心跳和连接
     * 
     * @memberof AppClient
     */
    close() {
      this.closeHeartBeat()
      databus.close()
    }

    /**
     * 登录总线，open成功后会自动登录，一般情况下用户不需要调用
     * 
     * @returns promise MsgExpress.LoginResponse
     * @memberof AppClient
     */
    loginBus() {
      const self = this
      return this.post('MsgExpress.LoginInfo', 'MsgExpress.LoginResponse', {
        type: 1,
        name: self._clientName,
        group: 1,
        uuid: 'rywyetyu24535',
        starttime: 0,
        auth: 'test'
      })
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
      return databus.buildProtoObject("msgexpress", "MsgExpress.SubscribeData").then(obj => {
        const objList = []
        for (let i = 0, count = protoList.length; i < count; i++) {
          let cmd = 0
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
            cmd = protoList[i]
          }
          if (cmd) {
            const newObj = JSON.parse(JSON.stringify(obj))
            newObj.subid = this._subIdStart++
              newObj.topic = cmd
            objList.push(newObj)
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

        databus.buildProtoObject(protoFilename, name)
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
      return new Promise((resolve, reject) => {
        const cmd = this._cmdParse.getCommandFromProto(protoRequest, protoResponse)
        if (!cmd) {
          console.error('command error, request:' + protoRequest + ', response:' + protoResponse)
          return reject('command error, request:' + protoRequest + ', response:' + protoResponse)
        }

        //console.log('postProto cmd:' + cmd + ', file:' + protoFilename + ', request:' + protoRequest + ', response:' + protoRequest)
        databus.requestOnce(cmd, protoFilename, protoRequest, protoResponse, {
          fillRequest: function (request) {
            Object.assign(request, requestObj)
          },
          handleResponse: function (response) {
            return resolve(response)
          },
          handlerError: function (err) {
            console.error(err)
            return reject(err)
          }
        })
      })
    }

    /**
     * 开启心跳，默认会开启，用户不需要调用
     * 
     * @memberof AppClient
     */
    startHeartBeat() {
      this.closeHeartBeat()
      this._heartBeatTimer = setInterval(() => {
        if (this.readyState() !== 1) {
          return
        }

        this.post("MsgExpress.HeartBeat", "MsgExpress.HeartBeatResponse", {
          cpu: 0,
          topmemory: 0,
          memory: 0,
          sendqueue: 0,
          receivequeue: 0
        }).then(() => {
          console.log('recv heartbeat');
        }).catch((err) => {
          console.log('post heartbeat error', err)
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
        return databus.buildProtoObject(this._cmdParse.getProtoFilename(proto.request), proto.request).then(Msg => {
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

  const CmdParse = function () {
    this.commandCache = {}
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

  return new AppClient(new CmdParse());
});