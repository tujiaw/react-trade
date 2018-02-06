import React, { Component } from 'react'
import { startWebSocket, loginBus, loginTrader, subscribeList } from './databus'


class App extends Component {
  state = {
    error: '',
    result: [],
  }

  onLoginBus = () => {
    startWebSocket('47.100.7.224', '55555')
    .then(() => {
      console.log('start web socket ok')
      return loginBus()
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

  onLoginTrader = () => {
    loginTrader('admin', 'admin', ['IC1802', 'IF1802', 'IH1802', 'i1805'])
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
    subscribeList(['Trade.TradingAccount'])
  }

  onClearResult = () => {
    this.setState({ error: '', result: [] })
  }

  render() {
    return (
      <div className="App">
        <button onClick={this.onLoginBus}>login bus</button>
        <button onClick={this.onLoginTrader}>login trader</button>
        <button onClick={this.onSubAccount}>sub account</button>
        <button onClick={this.onClearResult}>clear</button>
        <div>
          <div>错误消息:{this.state.error}</div>
          <div>应答结果：</div>
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
