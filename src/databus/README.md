# web使用方式
可以看webtest.html demo   
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

// 设置推送回调
cbus.setPublish((data) => {
  this.setState({ publishCount: this.state.publishCount + 1 });
  console.log('on publish:' + data.request);
  const ls = [...this.state.result]
  ls.push('publish msg, ' + JSON.stringify(data.content))
  this.setState({ result: ls })
})

// 打开连接（内部会自动登录总线和订阅）
cbus.open('ws://47.100.7.224:55555', [
  'HelloServer.HelloSub, MsgExpress.CommonResponse',
])
.then(json => {
  console.log('----------');
})
.catch((err) => {
  console.log(JSON.stringify(err))
})

// 发送消息
cbus.post('HelloServer.HelloReq', 'HelloServer.HelloRsp', {
  name: 'hello'
})
.then((json) => {
  console.log(json);
})
.catch((err) => {
  console.log(err)
})
```

# react native使用方法
与react基本相同，区别在于：
* react native中protobufjs要用6.7.0老版本的，否则enum会出错  
* 使用protobufjs提供的命令行将proto文件转换为json文件，然后调用databus的initProtoJson接口初始化  
> 原因是：react native中protobufjs没办法直接读取proto文件


