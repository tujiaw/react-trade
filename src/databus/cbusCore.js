(function (global, factory) {
  /* CommonJS */
  if (typeof require === 'function' && typeof module === "object" && module && module["exports"])
    module['exports'] = (function () {
      var cbusPackage = require('./cbusPackage');
      var ProtoBuf = require("protobufjs");
      var Long = require("long");
      ProtoBuf.util.Long = Long;
      ProtoBuf.configure();
      return factory(ProtoBuf, require('bytebuffer'), cbusPackage);
    })();
  /* Global */
  else
    global["cbusCore"] = factory(
      global.protobuf,
      global.dcodeIO.ByteBuffer,
      global.cbusPackage
    );
})(this, function (ProtoBuf, ByteBuffer, cbusPackage) {
  var global = this;                        // 当前环境
  var ws = undefined;                       // WebSocket
  var serial = 65536;                       // 发送消息的起始序号
  var protobufBuilders = {};                // protobuf解析缓存

  var pushDataFactory = undefined;          // 处理推送的消息
  var wsurl = '';                           // 地址
  var PREFIX_DATABUS = "DATABUS";           // 消息发送序号前缀
  var PROTO_FILE_DIR = '/protobuf/';        // proto文件所在目录
  var reconnectAttempts = 0;                // 尝试重连次数
  var reconnectIntervalSecond = 0;          // 重连间隔
  var responseTimeoutSecond = 0;            // 应答超时时间

  class Observer {
    constructor() {
      this.subscribers = {}; // 订阅者对象
      this.timeoutCheckerId = setInterval(() => {
        const curTime = new Date().getTime();
        for (const key in this.subscribers) {
          const fnCount = this.subscribers[key].length;
          let deleteCount = 0;
          // 检查请求的对象为空或者应答超时
          for (let i = 0; i < fnCount; i++) {
            const fnObj = this.subscribers[key][i]
            if (fnObj) {
              if (responseTimeoutSecond > 0 && (curTime - fnObj.time > responseTimeoutSecond * 1000)) {
                fnObj.fn('timeout', true);
              }
            } else {
              deleteCount++;
            }
          }
          // 删除已经处理的请求
          if (fnCount === deleteCount) {
            delete this.subscribers[key];
          }
        }
      }, 1000);
    }

    // 订阅方法，返回订阅event标识符
    sub(evt, fn) {
      const obj = { fn: fn, time: new Date().getTime() };
      if (this.subscribers[evt]) {
        this.subscribers[evt].push(obj);
      } else {
        this.subscribers[evt] = [obj];
      }
      const fnNumber = this.subscribers[evt].length - 1;
      return '{"evt":"' + evt + '","fn":"' + fnNumber + '"}';
    }

    // 发布方法
    pub(evt, args) {
      if (!this.subscribers[evt]) {
        console.error('put not find, sn:' + evt);
        return;
      }

      for (let i = 0, count = this.subscribers[evt].length; i < count; i++) {
        const fnObj = this.subscribers[evt][i];
        if (fnObj && (typeof fnObj.fn === 'function')) {
          if (arguments.length === 2) {
            fnObj.fn(args);
          } else {
            fnObj.fn(arguments[1], arguments[2], arguments[3], arguments[4], arguments[5], arguments[6])
          }
        }
      }
    }

    // 解除订阅，需传入订阅event标识符
    unsub(subId) {
      try {
        var id = JSON.parse(subId);
        if (this.subscribers[id.evt] && this.subscribers[id.evt][id.fn]) {
          // console.log('unsub sn:' + id.evt + '.' + id.fn + ', cost:' + (new Date().getTime() - this.subscribers[id.evt][id.fn].time) + 'ms');
          delete this.subscribers[id.evt][id.fn];
        }
      } catch (err) {
        console.log(err);
      }
    }
  }

  var cbusCore = {
    observer: new Observer(),
    close: function () {
      if (ws) {
        console.log('close websocket');
        ws.onopen = function () {}
        ws.onmessage = function () {}
        ws.onclose = function () {}
        ws.close()
        ws = undefined
      }
    },
    readyState: function () {
      if (ws) {
        return ws.readyState
      }
      return -1
    },
    setReconnectIntervalSecond: function(second) {
      reconnectIntervalSecond = second;
    },
    setResponseTimeoutSecond: function(second) {
      responseTimeoutSecond = second;
    },
    connect: function (url, options) {
      var self = this;
      wsurl = url;
      var settings = {
        onConnectSuccess: undefined,
        onConnectError: undefined,
        onConnectClose: undefined
      };
      this.extend(settings, options);
      console.log('websocket connect to:' + wsurl);
      if (global.WebSocket) {
        ws = new global.WebSocket(wsurl);
      } else if (global.MozWebSocket) {
        ws = new global.MozWebSocket(wsurl);
      } else {
        console.log("No Support WebSocket...");
        return;
      }

      const handleOldPublish = function (p) {
        Promise.all([
          self.buildProtoObject("msgexpress", "MsgExpress.DataType"),
          self.buildProtoObject("msgexpress", "MsgExpress.PublishData")
        ]).then(values => {
          const DataType = values[0].values
          const publishObj = values[1]
          const msg = publishObj.decode(p.body.view)
          if (msg && msg.item) {
            let content = []
            for (let j = 0; j < msg.item.length; j++) {
              let item = msg.item[j];
              let key = item.key;
              let type = item.type;
              let value = item.value[0];
              if (type === DataType.STRING) {
                value = item.strVal[0];
              } else if (type === DataType.INT64) {
                value = item.lVal[0];
              } else if (type === DataType.UINT64) {
                value = item.ulVal[0];
              } else if (type === DataType.INT32) {
                value = item.iVal[0];
              } else if (type === DataType.UINT32) {
                value = item.uiVal[0];
              } else if (type === DataType.FLOAT) {
                value = item.fVal[0];
              } else if (type === DataType.DOUBLE) {
                value = item.fVal[0];
              } else if (type === DataType.DATETIME) {
                value = item.tVal[0];
              } else if (type === DataType.BINARY) {
                value = item.rawVal[0].toString("binary");
              }
              content.push({
                key: key,
                value: value
              });
            }
            if (pushDataFactory && content.length) {
              pushDataFactory(msg.topic, content);
            }
          }
        }).catch(err => {
          console.error(err)
        })
      }

      ws.binaryType = "arraybuffer";
      ws.onopen = function () {
        reconnectAttempts = 0;
        console.log("websocket connect success", wsurl);
        if (settings.onConnectSuccess) {
          settings.onConnectSuccess();
        }
      };

      ws.onmessage = function (evt) {
        if (typeof (evt.data) === "string") {
          console.log("Receive String Data");
          return;
        }

        let packages = undefined;
        try {
          const bb = ByteBuffer.wrap(evt.data, "binary");
          packages = cbusPackage.decodePackage(bb);
        } catch (err) {
          console.log(err)
          return;
        }

        for (let i = 0, count = packages.length; i < count; i++) {
          const p = packages[i];
          if (p.getType() === cbusPackage.Publish) {
            if (p.isPublishNewMsg()) {
              if (pushDataFactory) {
                pushDataFactory(p.getCommand(), p.body.view)
              }
            } else {
              handleOldPublish(p)
            }
          } else {
            self.publishInfo(PREFIX_DATABUS, p.getSerialNumber(), p.body, p.getCommand() ? false : true);
          }
        }
      };

      ws.onclose = function (event) {
        console.log("websocket closed, code:" + event.code);
        if (settings.onConnectClose) {
          settings.onConnectClose(event);
        }

        if (reconnectIntervalSecond > 0) {
          // 间隔时间这次是上次的1.5倍
          const time = reconnectIntervalSecond * Math.pow(1.5, reconnectAttempts) * 1000;
          setTimeout(function () {
            reconnectAttempts++;
            console.log('reconnect..., interval: ' + time + ', times:' + reconnectAttempts);
            self.connect(wsurl, settings);
          }, time)
        }
      };
      ws.onerror = function (event) {
        console.log('websocket error', event);
        if (settings.onConnectError) {
          settings.onConnectError(event);
        }
      }
    },

    // 可以使用json格式直接初始化
    addProtoBuilder: function (protoFileName, requireObj) {
      try {
        var root = ProtoBuf.Root.fromJSON(requireObj)
        protobufBuilders[protoFileName] = root
      } catch (err) {
        console.error('addProtoBuilder error', protoFileName, err)
      }
    },

    // 构建一个protobuf包
    buildProtoPackage: function (proto_package) {
      return new Promise((resolve, reject) => {
        if (protobufBuilders[proto_package]) {
          return resolve(protobufBuilders[proto_package])
        }

        if (PROTO_FILE_DIR[PROTO_FILE_DIR.length - 1] !== '/') {
          PROTO_FILE_DIR += '/'
        }
        const protoFilePath = PROTO_FILE_DIR + proto_package + ".proto"
        ProtoBuf.load(protoFilePath).then((root) => {
          protobufBuilders[proto_package] = root;
          return resolve(root)
        }).catch((err) => {
          console.error('buildProtoPackage ', proto_package, err, protoFilePath)
          return reject(err)
        });
      })
    },

    // 构建一个protobuf对象
    buildProtoObject: function (proto_package, proto_objectname) {
      return new Promise((resolve, reject) => {
        const packageName = proto_package
        const objectName = proto_objectname
        return this.buildProtoPackage(packageName).then((root) => {
          const obj = root.lookupTypeOrEnum(objectName)
          if (obj) {
            // console.log('buildProtoObject', proto_package, proto_objectname)
            return resolve(obj)
          }
          const errStr = 'builerProtoObject ' + objectName + ' failed'
          console.error(errStr)
          return reject(errStr)
        })
      })
    },

    requestOnce: function (cmd, proto_package, proto_request, proto_response, callback) {
      return this.buildProtoObject(proto_package, proto_request).then((obj) => {
        var payload = {}
        callback.fillRequest(payload);
        // 验证填充的数据是否有效
        var errMsg = obj.verify(payload);
        if (errMsg) {
          console.error('requestOnce verify err', errMsg, proto_request, payload)
          return Promise.reject('requestOnce verify err: ' + errMsg + ',' + proto_request)
        }
        // 创建消息对象
        var message = obj.create(payload); // or use .fromObject if conversion is necessary
        // console.log('requestOnce', message)
        // 编码二进制流
        var buffer = obj.encode(message).finish();
        // 一定要拷贝一份，否则byteOffset会一直累加（大概到250次）造成encodePackage错误
        buffer = new Uint8Array(buffer)
        // 包装成ByteBuffer
        var binary = ByteBuffer.wrap(buffer, "binary");
        return this.sendmsg(cmd, binary, proto_package, proto_response, callback, false);
      })
    },

    sendmsg: function (cmd, byteBuffer, proto_package, proto_response, callback, forever) {
      var serialnum = serial++;
      var pack;
      try {
        pack = cbusPackage.encodePackage(serialnum, cmd, byteBuffer);
      } catch (err) {
        console.error(serialnum, cmd, err)
        return Promise.reject(err);
      }

      if (forever === undefined || !forever) {
        const self = this
        this.subscribeInfo(PREFIX_DATABUS, serialnum, function (info, iserror) {
          if (iserror === undefined || !iserror) { // 处理应答
            self.buildProtoObject(proto_package, proto_response).then(obj => {
              try {
                const msg = obj.decode(info.view);
                callback.handleResponse(msg);
              } catch (e) {
                console.error(proto_response, e)
              }
            })
          } else if (callback.handlerError) { // 处理错误
            if (info instanceof ByteBuffer) {
              self.buildProtoObject("msgexpress", "MsgExpress.ErrMessage").then(obj => {
                try {
                  const msg = obj.decode(info.view);
                  callback.handlerError(msg);
                } catch (e) {
                  console.error('ErrMessage', e)
                }
              })
            } else {
              callback.handlerError(info);
            }
          }
        });
      }
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(pack.toArrayBuffer());
      } else {
        return Promise.reject('websocket disconnect.')
      }
    },
    setPushDataFactory: function (factory) {
      pushDataFactory = factory;
    },
    subscribeInfo: function (prefix, id, callback) {
      var self = this;
      var subId = this.observer.sub(prefix + id, function (info, extra) {
        callback(info, extra);
        self.observer.unsub(subId);
      });
    },
    publishInfo: function (prefix, id, info, extra) {
      this.observer.pub(prefix + id, info, extra);
    },
    extend: function (parent, child) {
      for (var p in child) {
        parent[p] = child[p];
      }
      return parent;
    },
    setProtoFileDir: function (dir) {
      PROTO_FILE_DIR = dir
    }
  }
  return cbusCore;
});