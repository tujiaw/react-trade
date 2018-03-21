# web使用方式
直接将databus目录拷贝到tomcat中webapps目录下，在浏览器上访问http://localhost:8080/databus/webtest.html，点击登录按钮弹出success表示成功，也可以看控制台日志

# react使用方式
## 安装依赖库
将下面第三方库加入到项目的package.json的dependencies中，然后: npm install
```
"bytebuffer": "^5.0.1",
"long": "^3.2.0",
"pako": "^1.0.6",
"protobufjs": "^6.7.0",
"xml2js": "^0.4.19",
```

## 生成Command.js文件
执行cbusGenerateCommand.js做两件事情：
1. 将Command.xml转换为json写入cbusCommand.js;
2. 读取protobuf目录下的.proto文件将package名字和proto文件名映射关系写入cbusCommand.js  
node执行js，如：
```
node cbusGenerateCommand.js
```

## 使用
使用databus/index.js中AppClient类就可以了
```
import appClient from '../databus'

// 连接并初始化
appClient.open(config.wsip, config.wsport)
  .then((json) => {
    return appClient.subscribe([
      'StockServer.StockDataRequest, StockServer.StockDataResponse',
      'Trade.TradingAccount, MsgExpress.CommonResponse',
      'Trade.MarketData, MsgExpress.CommonResponse',
      'Trade.Position, MsgExpress.CommonResponse',
      'Trade.Order, MsgExpress.CommonResponse',
      'Trade.Trade, MsgExpress.CommonResponse',
      'Trade.ErrorInfo, MsgExpress.CommonResponse'
    ], (data) => {
      // 处理推送
      this.handleDispatch(data)
    })
  })
  .then((json) => {
    console.log('subscribe result', json)
    return appClient.post('Trade.LoginReq', 'Trade.LoginResp', {
      userid: config.username,
      passwd: config.password,
      instruments: config.codeList
    })
  })
  .then((json) => {
    console.log('login trade', json)
    resolve(json)
  })
  .catch((err) => {
    console.log(JSON.stringify(err))
    reject(err)
  })

// 发送消息
appClient.post('Trade.ModifyReq', 'Trade.ModifyResp', {
  orderid: orderId,
  price: price
}).then(json => {
  // 应答
})
```

# react native使用方法
与react基本相同，区别在于：
* react native中protobufjs要用6.7.0老版本的，否则enum会出错  
* 使用protobufjs提供的命令行将proto文件转换为json文件，然后调用databus的initProtoJson接口初始化  
> 原因是：react native中protobufjs没办法直接读取proto文件


