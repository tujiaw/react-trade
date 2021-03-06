(function(global, factory) {
  // CommonJS, Global
  if (typeof require === 'function' && typeof module === "object" && module && module["exports"]) {
    module['exports'] = (function() { return factory(); })();
  } else {
    global["cbusCommand"] = factory();
  }
})(this, function() {
  return {
    AppList: [
  {
    "$": {
      "id": "0",
      "name": "DataBus",
      "desc": "Data Bus"
    },
    "function": [
      {
        "$": {
          "id": "0",
          "request": "MsgExpress.ErrMessage",
          "response": "MsgExpress.ErrMessage",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "1",
          "request": "MsgExpress.StartupApplication",
          "response": "MsgExpress.CommonResponse",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "2",
          "request": "MsgExpress.PublishData",
          "response": "MsgExpress.CommonResponse",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "3",
          "request": "MsgExpress.LoginInfo",
          "response": "MsgExpress.LoginResponse",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "4",
          "request": "MsgExpress.Logout",
          "response": "MsgExpress.CommonResponse",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "5",
          "request": "MsgExpress.HeartBeat",
          "response": "MsgExpress.HeartBeatResponse"
        }
      },
      {
        "$": {
          "id": "6",
          "request": "MsgExpress.StopBroker",
          "response": "MsgExpress.CommonResponse",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "11",
          "request": "MsgExpress.SimpleSubscription",
          "response": "MsgExpress.CommonResponse",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "12",
          "request": "MsgExpress.SubscribeData",
          "response": "MsgExpress.CommonResponse",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "13",
          "request": "MsgExpress.UnSubscribeData",
          "response": "MsgExpress.CommonResponse",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "14",
          "request": "MsgExpress.ComplexSubscribeData",
          "response": "MsgExpress.CommonResponse"
        }
      },
      {
        "$": {
          "id": "15",
          "request": "MsgExpress.GetAppList",
          "response": "MsgExpress.AppList"
        }
      },
      {
        "$": {
          "id": "16",
          "request": "MsgExpress.GetAppInfo",
          "response": "MsgExpress.AppInfo"
        }
      },
      {
        "$": {
          "id": "17",
          "request": "MsgExpress.UpdateAppStatus",
          "response": "MsgExpress.CommonResponse"
        }
      },
      {
        "$": {
          "id": "18",
          "request": "MsgExpress.KickOffApp",
          "response": "MsgExpress.CommonResponse",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "19",
          "request": "MsgExpress.RestartApp",
          "response": "MsgExpress.CommonResponse",
          "desc": ""
        }
      }
    ]
  },
  {
    "$": {
      "id": "1",
      "name": "Gateway",
      "desc": ""
    },
    "function": [
      {
        "$": {
          "id": "1",
          "request": "Gateway.Login",
          "response": "Gateway.CommonResponse",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "2",
          "request": "Gateway.Logout",
          "response": "Gateway.CommonResponse",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "3",
          "request": "Gateway.Subscribe",
          "response": "Gateway.SubscribeResult",
          "desc": ""
        }
      }
    ]
  },
  {
    "$": {
      "id": "2",
      "name": "Security",
      "desc": ""
    },
    "function": [
      {
        "$": {
          "id": "1",
          "request": "Security.ReqSessionValid",
          "response": "Security.ResSessionValid",
          "desc": ""
        }
      }
    ]
  },
  {
    "$": {
      "id": "255",
      "name": "StockInfoServer",
      "desc": ""
    },
    "function": [
      {
        "$": {
          "id": "1",
          "request": "StockServer.StockDataRequest",
          "response": "StockServer.StockDataResponse",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "2",
          "request": "StockServer.IpoDataRequest",
          "response": "StockServer.IpoDataResponse",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "3",
          "request": "StockServer.StockInfoRequest",
          "response": "StockServer.StockInfoResponse",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "4",
          "request": "StockServer.NewStockDataRequest",
          "response": "StockServer.NewStockDataResponse",
          "desc": ""
        }
      }
    ]
  },
  {
    "$": {
      "id": "264",
      "name": "RealTimeMarket",
      "desc": ""
    },
    "function": [
      {
        "$": {
          "id": "2",
          "request": "StockServer.TickData",
          "response": "MsgExpress.CommonResponse",
          "ispublish": "true",
          "desc": ""
        }
      }
    ]
  },
  {
    "$": {
      "id": "888",
      "name": "Trade",
      "desc": ""
    },
    "function": [
      {
        "$": {
          "id": "1",
          "request": "Trade.LoginReq",
          "response": "Trade.LoginResp",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "2",
          "request": "Trade.LogoutReq",
          "response": "Trade.LogoutResp",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "3",
          "request": "Trade.OrderReq",
          "response": "Trade.OrderResp",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "4",
          "request": "Trade.CancelReq",
          "response": "Trade.CancelResp",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "5",
          "request": "Trade.ModifyReq",
          "response": "Trade.ModifyResp",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "6",
          "request": "Trade.MarketDataReq",
          "response": "Trade.MarketDataResp",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "10",
          "request": "Trade.TradingAccount",
          "response": "MsgExpress.CommonResponse",
          "ispublish": "true",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "11",
          "request": "Trade.MarketData",
          "response": "MsgExpress.CommonResponse",
          "ispublish": "true",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "12",
          "request": "Trade.Position",
          "response": "MsgExpress.CommonResponse",
          "ispublish": "true",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "13",
          "request": "Trade.Order",
          "response": "MsgExpress.CommonResponse",
          "ispublish": "true",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "14",
          "request": "Trade.Trade",
          "response": "MsgExpress.CommonResponse",
          "ispublish": "true",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "15",
          "request": "Trade.ErrorInfo",
          "response": "MsgExpress.CommonResponse",
          "ispublish": "true",
          "desc": ""
        }
      }
    ]
  },
  {
    "$": {
      "id": "320",
      "name": "HelloServer",
      "desc": ""
    },
    "function": [
      {
        "$": {
          "id": "1",
          "request": "HelloServer.HelloReq",
          "response": "HelloServer.HelloRsp",
          "desc": ""
        }
      },
      {
        "$": {
          "id": "2",
          "request": "HelloServer.HelloSub",
          "response": "MsgExpress.CommonResponse",
          "ispublish": "true",
          "desc": ""
        }
      }
    ]
  }
],
    ProtoFileList: [
  {
    "filename": "helloserver",
    "package": "HelloServer"
  },
  {
    "filename": "msgexpress",
    "package": "MsgExpress"
  },
  {
    "filename": "stockserver",
    "package": "StockServer"
  },
  {
    "filename": "trade",
    "package": "Trade"
  }
]
  }
});