import React, { Component } from 'react'
import cbus from './databus'

class App extends Component {
  state = {
    error: '',
    sendCount: 0,
    result: [],
  }

  handleDispatch = (data) => {
    console.log("handle dispatch", data)
  }

  onLoginBus = () => {
    cbus.setHeartBeatIntervalSecond(5)
    cbus.setEvent(
      function onopen() {
        console.log('on open', new Date().toLocaleTimeString());
      },
      function onclose(event) {
        console.log('on close', event, new Date().toLocaleTimeString());
      },
      function onerror(event) {
        console.log('on error', event, new Date().toLocaleTimeString());
      }
    )

    cbus.open('ws://47.100.7.224:55555', [
      'StockServer.StockDataRequest, StockServer.StockDataResponse',
      'Trade.TradingAccount, MsgExpress.CommonResponse', 
      'Trade.MarketData, MsgExpress.CommonResponse',
      'Trade.Position, MsgExpress.CommonResponse',
      'Trade.Order, MsgExpress.CommonResponse',
      'Trade.Trade, MsgExpress.CommonResponse',
      'Trade.ErrorInfo, MsgExpress.CommonResponse'
    ])
    .then(json => {
      console.log('----------');
    })
    .catch((err) => {
      console.log(JSON.stringify(err))
    })
  }

  onHello = () => {
    this.setState({ sendCount: this.state.sendCount + 1 });
    cbus.post('TestServer.HelloReq', 'TestServer.HelloRsp', {
      name: 'hello, world!'
    })
    .then((json) => {
      const ls = [...this.state.result]
      ls.push(JSON.stringify(json))
      this.setState({ result: ls })
    })
    .catch((err) => {
      this.setState({ error: JSON.stringify(err) })
    })
  }

  onSubAccount = () => {
  }

  onClearResult = () => {
    this.setState({ error: '', result: [] })
  }

  render() {
    return (
      <div className="App">
        <button onClick={this.onLoginBus}>login bus</button>
        <button onClick={this.onHello}>hello</button>
        <button onClick={this.onSubAccount}>sub account</button>
        <button onClick={this.onClearResult}>clear</button>
        <div>
          <div>发送消息:{this.state.sendCount}</div>
          <div>错误消息:{this.state.error}</div>
          <div>应答结果：{this.state.result.length}</div>
          <ul>
            {this.state.result.map((item, index) => {
              return <li key={index}>{item}</li>
            })}
          </ul>
        </div>
      </div>
    );
  }
}

export default App;
