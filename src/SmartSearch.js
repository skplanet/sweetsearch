class SmartSearch extends CommonComponent {
	
	constructor(elTarget, htOption) {
		super(htOption)
		this.elTarget = elTarget;
		this.init(htOption);
	}

	//TODO. think about moving super class.
	init(htOption) {
		this.setInitValue();
		super.setOption(htOption, this._htDefaultOption, this.option);
		this.registerEvents();
		this.initPlugins();
	}

	setInitValue() {
		let s = {
			inputFieldWrap 		: ".inputWrap",
			inputField 			: ".input-field",
			autoCompleteWrap 	: ".auto-complete-wrap",
			closeLayer 			: ".closeLayer",
			clearQueryBtn 		: ".clearQuery",
			autoULWrap			: ".auto-complete-wrap .ul-wrap",
			realForm 			: "#search-form"
		} 

		let aDefaultFn = ['fnInsertAutoCompleteWord','fnSelectAutoCompleteWord', 'fnSubmitForm'];

		this._htDefaultOption 	= {
			'autoComplete' 	: {
				requestType 		: 'jsonp',
				sAutoCompleteURL 	: ""
			},
			'RecentWordPlugin' 		: {
				'usage' : false,
                'maxList' : 5
			}
		}

		this.option 			= {};
		let _el 				= this.elTarget;

		this.elInputFieldWrap	= _el.querySelector(s.inputFieldWrap);
		this.elInputField 		= _el.querySelector(s.inputField);
		this.elAutoCompleteLayer= _el.querySelector(s.autoCompleteWrap);
		this.elClearQueryBtn 	= _el.querySelector(s.clearQueryBtn);
		this.elForm 			= _el.querySelector(s.realForm);

		this.elCloseButton 		= this.elAutoCompleteLayer.querySelector(s.closeLayer);
		this.elAutoULWrap		= this.elAutoCompleteLayer.querySelector(s.autoULWrap);

		this.htCachedData 		= {};
		this.htDefaultFn 		= super.getDefaultCallbackList(aDefaultFn);
		this.htFn 				= {};

		//plugins
		this.htPluginList		= {'RecentWordPlugin' : RecentWordPlugin};
		this.htPluginInstance 	= {};
	}

	registerEvents() {
		this.elInputFieldWrap.addEventListener("touchend", 	(evt) => this.handlerInputWrap(evt));

		this.elInputField.addEventListener("keypress", 		(evt) => this.handlerInputKeyPress(evt));
		this.elInputField.addEventListener("keydown", 		(evt) => this.handlerInputKeydown(evt));
		this.elInputField.addEventListener("input", 		(evt) => this.handlerInputKeyInput(evt));

		this.elCloseButton.addEventListener("touchend", 	(evt) => this.handlerCloseLayer(evt));
		this.elClearQueryBtn.addEventListener("touchend", 	(evt) => this.handlerClearInputValue(evt));

		this.elAutoULWrap.addEventListener("touchstart", 	(evt) => this.handlerSelectAutoCompletedWordTouchStart(evt));
		this.elAutoULWrap.addEventListener("touchend", 		(evt) => this.handlerSelectAutoCompletedWordTouchEnd(evt));

		this.elForm.addEventListener("submit", 				(evt) => this.handlerSubmitForm(evt));
	}

	initPlugins() {
		this.htPluginInstance 	= super.getPluginInstance(this.htPluginList, this.option, this.elTarget);
	}

	onMethod(htUserFn) {
		super.setOption(htUserFn, this.htDefaultFn, this.htFn);
		super.registerPluginCallback(htUserFn);
	}


	/***** START EventHandler *****/
	handlerInputWrap(evt) {
		this.execAfterFocus(evt);
		this.elInputField.focus();
	}

	//입력필드에 들어가는 값의 어떠한 처리가 필요할때 여기서 처리한다.
	handlerInputKeyPress(evt) {}
	
	//특수키(keycode 8인 backspace등) 작업 조정이 필요한 경우 여기서 처리.
	handlerInputKeydown(evt) {}

	handlerInputKeyInput(evt) {
		let sInputData = this.elInputField.value;

		if(sInputData.length > 0 ) _cu.setCSS(this.elClearQueryBtn, "display", "inline-block");
		else _cu.closeLayer(this.elClearQueryBtn);

		//after input word, must hide a recent word layer
		let oRecentWordPlugin = this.htPluginInstance["RecentWordPlugin"];
		if(oRecentWordPlugin) _cu.closeLayer(oRecentWordPlugin.elRecentWordLayer);

		if (typeof this.htCachedData[sInputData] === "undefined") this.autoCompleteRequestManager(sInputData);
		else this.execAfterAutoCompleteAjax(sInputData, this.htCachedData[sInputData]);
	}

	handlerClearInputValue(evt) {
		this.elInputField.value = "";
		this.handlerCloseLayer();
		_cu.closeLayer(this.elClearQueryBtn);
	}
	
	handlerCloseLayer(evt) {
		_cu.closeLayer(this.elAutoCompleteLayer);
	}

	handlerSelectAutoCompletedWordTouchStart(evt) {
		this.htTouchStartSelectedWord = {'x' : evt.changedTouches[0].pageX, 'y' : evt.changedTouches[0].pageY};
	}

	handlerSelectAutoCompletedWordTouchEnd(evt) {
		let nowPageY = evt.changedTouches[0].pageY;
		if(this.isExecuteTouchScroll(nowPageY)) return;

		let sText = this.htFn.fnSelectAutoCompleteWord(evt.target);
	}

	handlerSubmitForm(evt, sQuery) {
        if(evt) evt.preventDefault();
        sQuery = sQuery || this.elInputField.value;
		this.htFn.fnSubmitForm(sQuery);

		let oRecentWordPlugin = this.htPluginInstance["RecentWordPlugin"];
		if(this.htPluginInstance["RecentWordPlugin"]) oRecentWordPlugin.saveQuery(sQuery);
	}
	/***** End EventHandler *****/


	isExecuteTouchScroll(pageY) {
		var nDiff = this.htTouchStartSelectedWord.y - pageY;
		if(nDiff !== 0) return true;
		return false;
	}

	execAfterFocus(evt) {
		//execute RecentWordPlugin.
		let oRecentWordPlugin = this.htPluginInstance["RecentWordPlugin"];
		if(!oRecentWordPlugin) return;
		oRecentWordPlugin.showRecentSearchWord();
	}

	execAfterAutoCompleteAjax(sQuery, sResult) {
		this.htFn.fnInsertAutoCompleteWord(sResult);
		if(this.elAutoCompleteLayer.querySelector("li") !== null) _cu.showLayer(this.elAutoCompleteLayer);
		else _cu.closeLayer(this.elAutoCompleteLayer);

		//save history
		this.htCachedData[sQuery] = sResult;
	}

	autoCompleteRequestManager(sQuery) {
		let type = this.option.autoComplete.requestType;
		let url = this.option.autoComplete.sAutoCompleteURL;
		switch(type) {
			case 'jsonp':
				this.makeAutoCompleteJSONPRequest(sQuery,url);
				break;
			case 'ajax':
				this.makeAutoCompleteAjaxRequest(sQuery,url);
				break;
			default: 
				//do something..
		}
	}

	makeAutoCompleteJSONPRequest(sQuery, sURL) {
		//amazon
		//_cu.sendSimpleJSONP(sURL, sQuery, "completion", this.execAfterAutoCompleteAjax.bind(this,sQuery));
		_cu.sendSimpleJSONP(sURL, sQuery, "ac_done", this.execAfterAutoCompleteAjax.bind(this,sQuery));
	}

	makeAutoCompleteAjaxRequest(sQuery, sURL) {
		// hardcoded url for test.
		let url = "../jsonMock/"+ sQuery +".json";
		let aHeaders = [["Content-Type", "application/json"]];
		_cu.sendSimpleAjax(url, this.execAfterAutoCompleteAjax.bind(this, sQuery), 
			JSON.stringify({
				sQuery : sQuery,
				nTime : Date.now() 
			}), 
		"get", aHeaders, sQuery);
	}

}
