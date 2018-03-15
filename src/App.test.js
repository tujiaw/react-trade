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