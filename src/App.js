import React, { Component } from 'react'
import cbus from './databus'

class App extends Component {
  state = {
    error: '',
    sendCount: 0,
    publishCount: 0,
    result: [],
    repeatValue: 2000,
  }

  componentDidMount() {
    cbus.setHeartBeatIntervalSecond(10)
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
    cbus.setPublish((data) => {
      this.setState({ publishCount: this.state.publishCount + 1 });
      console.log('on publish:' + data.request);
      const ls = [...this.state.result]
      ls.push('publish msg, ' + JSON.stringify(data.content))
      this.setState({ result: ls })
    })

    cbus.open(
      ['ws://172.16.66.187:1111', 'ws://172.16.66.87:1111'], 
      ['HelloServer.HelloSub, MsgExpress.CommonResponse']
    ).then(json => {
      console.log(json);
    }).catch(err => {
      console.log('open failed', err);
    })
  }

  componentWillUnmount() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  handleDispatch = (data) => {
    console.log("handle dispatch", data)
  }

  onHello = () => {
    const startTime = new Date().getTime();
    this.setState({ sendCount: this.state.sendCount + 1 });
    cbus.post('HelloServer.HelloReq', 'HelloServer.HelloRsp', {
      name: '' + startTime
    })
    .then((json) => {
      const serverRecvTime = parseInt(json.content);
      const endTime = new Date().getTime();
      json.content = `server recv cost: ${endTime - serverRecvTime}ms, total cost: ${endTime - startTime}ms`
      const ls = [...this.state.result]
      ls.push(JSON.stringify(json))
      this.setState({ result: ls })
    })
    .catch((err) => {
      this.setState({ error: JSON.stringify(err) })
    })
  }

  onRepeat = () => {
    if (this.timerId) {
      clearInterval(this.timerId);
    }

    this.timerId = setInterval(() => {
      this.onHello();
    }, this.state.repeatValue);

    console.log(this.state.repeatValue);
  }

  onClearResult = () => {
    this.setState({ error: '', sendCount: 0, publishCount: 0, result: [] })
  }

  onClose = () => {
    cbus.close();
  }

  render() {
    return (
      <div style={styles.root}>
        <button onClick={this.onHello}>hello</button>
        <button onClick={this.onRepeat}>repeat</button>
        <input defaultValue={this.state.repeatValue} onChange={(evt) => this.setState({repeatValue: evt.target.value })}
        ></input>
        <button onClick={this.onClearResult}>clear</button>
        <button onClick={this.onClose}>close</button>
        
        <div style={styles.content}>
          <div style={styles.count}>
            <div style={styles.countItem}>发送消息数：{this.state.sendCount}</div>
            <div style={styles.countItem}>收到推送消息数：{this.state.publishCount}</div>
            <div style={styles.countItem}>收到的总消息数：{this.state.result.length}</div>
            <div style={styles.countItem}>错误消息：{this.state.error}</div>
          </div>
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

const styles = {
  root: {
    margin: 10
  },
  count: {
    display: 'flex',
    flexDirection: 'row',
    marginTop: 10,
  },
  countItem: {
    marginRight: 10,
  }
}

export default App;
