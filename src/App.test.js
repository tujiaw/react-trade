const cbus = require('./databus')
cbus.setPublish(function(data) {
  console.log(data);
})
cbus.setProtoFileDir(__dirname + '/databus/protobuf');
cbus.open('ws://172.16.66.87:1111', ['HelloServer.HelloSub, MsgExpress.CommonResponse'])
.then(json => {
  console.log(json);
  setInterval(() => {
    cbus.post('HelloServer.HelloReq', 'HelloServer.HelloRsp', {
      name: 'nodejs'
    }).then((json) => {
      console.log(json);
    }).catch(err => {
      console.log(err);
    })
  }, 3000);
}).catch(err => {
  console.log(err);
})
