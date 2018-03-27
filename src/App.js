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

    cbus.open(
      ['ws://172.16.66.87:1111', 'ws://172.16.66.87:8888'],
      ['HelloServer.HelloSub, MsgExpress.CommonResponse']
    ).then(json => {
      this.setState({ tip: json })
    }).catch(err => {
      this.setState({ tip: 'open failed' })
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
    this.setState({ requestCount: this.state.requestCount + 1 });
    cbus.post('HelloServer.HelloReq', 'HelloServer.HelloRsp', {
      name: '' + startTime
    }).then((json) => {
      const serverRecvTime = parseInt(json.content, 10);
      const ms = Math.max(new Date().getTime() - serverRecvTime, 0);
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
