import React, { Component } from 'react'
import cbus from './databus'

class App extends Component {
  state = {
    tip: '',
    requestCount: 0,
    responseCount: 0,
    publishCount: 0,
    totalCount: 0,

    requestResponseAvgCost: 0,
    recvPublishAvgCost: 0,
    
    requestResponseTotalCost: 0,
    recvPublishTotalCost: 0,

    result: [],
    repeatValue: 2000,
    packSize: 1024
  }

  componentDidMount() {
    cbus.setEvent(
      function onopen() {
        console.log('on open', new Date().toLocaleTimeString());
      },
      function onclose(event) {
        console.log('on close', event, new Date().toLocaleTimeString());
      },
      function ontip(event) {
        console.log('on tip', event, new Date().toLocaleTimeString());
      }
    )
    cbus.setPublish((data) => {
      console.log('publish', data.content);
      const publishCount = this.state.publishCount + 1;
      const totalCount = this.state.totalCount + 1;
      const ms = new Date().getTime() - parseInt(data.content.str1, 10);
      const recvPublishTotalCost = this.state.recvPublishTotalCost + ms;
      this.setState({ 
        publishCount: publishCount,
        totalCount: totalCount,
        recvPublishTotalCost: recvPublishTotalCost,
        recvPublishAvgCost: parseInt(recvPublishTotalCost / publishCount, 10),
      });
    })
    
    // ['ws://172.16.66.87:1111', 'ws://172.16.66.87:8888'],
    // cbus.open('ws://47.100.7.224:55555').then(json => {
    //   this.setState({ tip: json })
    //   return cbus.post('Trade.LoginReq', 'Trade.LoginResp', {
    //     userid: 'admin',
    //     passwd: 'admin',
    //     instruments: ['IC1803', 'IF1803', 'IH1803', 'i1805']
    //   })
    // })
    // .then(json => {
    //   console.log('login trade result', json);
    // })
    // .catch(err => {
    //   this.setState({ tip: 'open failed' })
    // })

    cbus.setHeartBeatIntervalSecond(100);
    cbus.open(['ws://172.16.66.87:1111', 'ws://172.16.66.87:8888']).then(json => {
      this.setState({ tip: json });
    }).catch(err => {
      this.setState({ tip: err });
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
    this.setState({ requestCount: this.state.requestCount + 1 });
    let str = '';
    for (let i = 0; i < this.state.packSize; i++) {
      str += 'A';
    }

    const startTime = new Date().getTime();
    cbus.post('HelloServer.HelloReq', 'HelloServer.HelloRsp', { str: str }).then((json) => {
      const ms = new Date().getTime() - startTime;
      console.log(`cost:${ms}ms, pack size:${json.str.length}`)
      if (str === json.str) {
        console.log('ok')
      } else {
        console.log('error');
      }
      // const serverRecvTime = parseInt(json.content, 10);
      // const ms = Math.max(new Date().getTime() - serverRecvTime, 0);
      const responseCount = this.state.responseCount + 1;
      const totalCount = this.state.totalCount + 1;
      const requestResponseTotalCost = this.state.requestResponseTotalCost + ms;
      this.setState({ 
        responseCount: responseCount,
        totalCount: totalCount,
        requestResponseTotalCost: requestResponseTotalCost,
        requestResponseAvgCost: parseInt(requestResponseTotalCost / responseCount, 10)
      });
    }).catch((err) => {
      this.setState({ tip: JSON.stringify(err) })
    })
  }

  onRepeat = () => {
    this.timerId && clearInterval(this.timerId);
    this.timerId = setInterval(() => {
      this.onHello();
    }, this.state.repeatValue);

    console.log(this.state.repeatValue);
  }

  onClear = () => {
    this.setState({
      tip: '',
      requestCount: 0,
      responseCount: 0,
      publishCount: 0,
      totalCount: 0,
  
      requestResponseAvgCost: 0,
      recvPublishAvgCost: 0,
      
      requestResponseTotalCost: 0,
      recvPublishTotalCost: 0,
  
      result: [],
    })
  }

  onClose = () => {
    cbus.close();
  }

  render() {
    return (
      <div style={styles.root}>
        <button onClick={this.onHello}>发送一条消息</button>
        <button onClick={this.onRepeat}>间隔循环发送(ms)</button>
        <input style={styles.inputInterval} defaultValue={this.state.repeatValue} onChange={(evt) => this.setState({repeatValue: evt.target.value })}
        ></input>
        <span>包大小</span>
        <input style={styles.inputInterval} defaultValue={this.state.packSize} onChange={(evt) => this.setState({packSize: evt.target.value })}
        ></input>
        <br/>
        <button onClick={this.onClose}>关闭总线连接</button>
        <button onClick={this.onClear}>清理结果</button><br/><br/>
        
        <div style={styles.content}>
          <div style={styles.count}>
            <div>请求消息数：{this.state.requestCount}</div>
            <div>应答消息数：{this.state.responseCount}</div>
            <div>请求应答平均耗时(ms)：{this.state.requestResponseAvgCost}</div>
            <div>收到推送消息数：{this.state.publishCount}</div>
            <div>收到推送平均耗时(ms)：{this.state.recvPublishAvgCost}</div>
            <div>收到的总消息数：{this.state.totalCount}</div>
            <div>提示消息：{this.state.tip}</div>
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
  inputInterval: {
    maxWidth: 60
  }
}

export default App;
