var databus = require('./databus')
var { AppList } = require('./Command')
var ByteBuffer = require('bytebuffer')

export const heartBeat = (function() {
	let timerid
	return {
		start: function() {
			this.stop()
			timerid = setInterval(sendHeartBeat, 50000)
		},
		stop: function() {
			clearInterval(timerid)
		}
	}
}())

// 根据proto获取command值
const commandCache = {}
function getCommandValue(proto_request, proto_response) {
	proto_response = proto_response || 'MsgExpress.CommonResponse'
	const proto_str = proto_request + '-' + proto_response 
	if (commandCache[proto_str]) {
		return commandCache[proto_str]
	}

	for (let i = 0, appCount = AppList.length; i < appCount; i++) {
		const app = AppList[i]
		const header = app['$']
		if (!header || !app['function']) {
			continue;
		}

		for (let j = 0, funcCount = app['function'].length; j < funcCount; j++) {
			const func = app['function'][j]
			const funcObj = func['$']
			if (funcObj) {
				if (funcObj.request === proto_request && funcObj.response === proto_response) {
					const val = (parseInt(header.id) << 20) | parseInt(funcObj.id)
					commandCache[proto_str] = val
					return val
				}
			}
		}
	}
	return -1
}

// 解析推送的消息
export function parsePublishMessage(protoFilename, jsonContent) {
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
 *  批量订阅
 * @param {[number]} subList 
 * @param {[number]} topicList 
 */
let subIdStart = 123
export function subscribeList(publishProtoRequestList) {
  return databus.buildProtoObject("msgexpress", "MsgExpress.SubscribeData").then(obj => {
		let objList = []
		for (let i = 0, count = publishProtoRequestList.length; i < count; i++) {
			const cmd = getCommandValue(publishProtoRequestList[i])
			if (cmd >= 0) {
				let newObj = {...obj}
				newObj.subid = subIdStart++
				newObj.topic = cmd
				objList.push(newObj)

				databus.requestPublishData(cmd, dispatchPublishMessage)
			}
		}
    return Promise.resolve(objList)
  }).then((objList) => {
		return protoRequest("msgexpress", "MsgExpress.ComplexSubscribeData", "MsgExpress.CommonResponse", {
			sub: objList
		}).then((response) => {
			if (response && response.retcode === 0) {
				return Promise.resolve()
			} else {
				return Promise.reject(response)
			}
		})
  })
}

function dispatchPublishMessage(jsonContent) {
	parsePublishMessage('trade', jsonContent).then((obj) => {
		console.log(obj)
	}).catch((err) => {
		console.log(err)
	})
}

/**
 * websocket连接
 */
export function startWebSocket(wsip, wsport, path) {
  return new Promise((resolve, reject) => {
      databus.connect(wsip, wsport, path || '', {
				onConnectSuccess: function() {
					databus.setPushDataFactory(function(topic, jsonContent) {
						databus.notifyPublishData(topic, jsonContent);
					});
					heartBeat.start()
					return resolve();
				},
				onConnectError: function() {
					return reject()
				},
				onConnectClose: function() {
					return reject()
				}
    })
  })
}

/**
 * 关闭websocket连接
 */
export function closeWebSocket() {
  databus.close();
}

export function protoRequest(protoFileName, protoRequest, protoResponse, requestObj) {
	return new Promise((resolve, reject) => {
		const cmd = getCommandValue(protoRequest, protoResponse)
		if (cmd < 0) {
			console.error('command error, request:' + protoRequest + ', response:' + protoResponse)
			return reject()
		}
		databus.requestOnce(cmd, protoFileName, protoRequest, protoResponse, {
			fillRequest: function(request) {
				Object.assign(request, requestObj)
			},
			handleResponse: function(response) {
				return resolve(response)
			}
		})
	})
}

/**
 * 发送心跳包
 */
function sendHeartBeat() {
	return protoRequest("msgexpress", "MsgExpress.HeartBeat", "MsgExpress.HeartBeatResponse", {
		cpu: 0, topmemory: 0, memory: 0, sendqueue: 0, receivequeue: 0
	})
}

// 登录总线
export function loginBus() {
	return protoRequest('msgexpress', 'MsgExpress.LoginInfo', 'MsgExpress.LoginResponse', {
		type: 1, 
		name: 'trade', 
		group: 1, 
		uuid: 'rywyetyu24535', 
		starttime: 0, 
		auth: 'test'
	})
}

/////////////////////////////////////////////////////////////////
export function loginTrader(username, password, codeList) {
	return protoRequest('trade', 'Trade.LoginReq', 'Trade.LoginResp', {
		userid: username,
		passwd: password,
		instruments: codeList
	})
}

// export function subAccount() {
// 	// databus.requestPublishData(Cons.TOPIC_TRADE_TRADINGACCOUNT, dispatchPublishTradingAccount)
// 	// return subscribeList([123], [Cons.TOPIC_TRADE_TRADINGACCOUNT])
// }
