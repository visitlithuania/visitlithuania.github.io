/*************************************************************************
 * ADOBE CONFIDENTIAL
 * ___________________
 *
 *  Copyright 2015 Adobe Systems Incorporated
 *  All Rights Reserved.
 *
 * NOTICE:  All information contained herein is, and remains
 * the property of Adobe Systems Incorporated and its suppliers,
 * if any.  The intellectual and technical concepts contained
 * herein are proprietary to Adobe Systems Incorporated and its
 * suppliers and are protected by all applicable intellectual property
 * laws, including trade secret and copyright laws.
 * Dissemination of this information or reproduction of this material
 * is strictly forbidden unless prior written permission is obtained
 * from Adobe Systems Incorporated.
 **************************************************************************/

define(['jquery', 'underscore',
  'ccApp/singleton/view/GeneralPreferencesView',
  'ccApp/singleton/view/TopNavView',
  'ccApp/singleton/view/FSContainerView',
  'ccApp/singleton/view/ContainerView',
  'ccApp/singleton/view/StatusBarView',
  'ccApp/singleton/view/ModalView',
  'ccApp/singleton/view/ErrorBarView',
  'ccApp/singleton/view/SelfUpdateDeprecatedBannerView',
  'ccApp/singleton/model/SelfUpdateDeprecatedBanner',
  'interface/events',
  'ccApp/utils/constants',
  'ccApp/utils/coreUtils',
  'alert/main',
  'interface/session'
], function ($, _, GeneralPreferencesView, TopNavView, FSView, ContainerView, StatusBarView, ModalView, ErrorBarView,
              SelfUpdateDeprecatedBannerView, SelfUpdateDeprecatedBannerModel, Events, k, CoreUtils, Alert, Session) {
  "use strict";

  var is_PREFERENCE_PANEL_READY = false,
    showPrefViewOnPanelReadyEvent = false,
    configData;

  function showPref () {
    is_PREFERENCE_PANEL_READY = true;
    if (showPrefViewOnPanelReadyEvent && !GeneralPreferencesView.isAttached()) {
      GeneralPreferencesView.render(configData);
    }
  }

  function setCoreConstant (tgtName, targetId, sourceId) {
    if (tgtName === k.UICORE_ID) { // At this time, UICORE_ID = C3Container_UICore
      setCoreConstant = Function("");
      k.UICORE_ID = targetId; // changing this to C3Container_UICore_1_dot_0_<instanceID>
      k.UINATIVE_ID = sourceId;
      CoreUtils.updateHeader(k.UINATIVE_ID);
    }
  }

  Events.on(k.CONST.EVT_PREFERENCE_PANEL_READY, showPref);

  return {
    init: function () {
      Events.on(k.EVT_SEND_MESSAGE, this.send);
    },
    send: "",

    receive: function (msgString, reqType) {
      var tgtName = msgString.targetID,
        tgtVer = msgString.targetVersion,
        tgtInstance = msgString.targetInstanceID,
        targetId = CoreUtils.SHARED.createId(tgtName, tgtVer);
      setCoreConstant(tgtName, targetId, msgString.sourceID);

      // checks if message is for container
      if (targetId === k.UICORE_ID) {
        switch (reqType) {
          // Switches the panel to the targetId
          case "ShowTab":
            console.debug("UICore: inside ShowTab");
            var tabId = msgString.xmlData.xmldata.data.TabId;
            if (tabId) {
              var tabVersion = msgString.xmlData.xmldata.data.TabVersion;
              if (!tabVersion) {
                tabVersion = "1.0";
              }
              var switchTo = CoreUtils.SHARED.createId(tabId, tabVersion);
              Events.trigger(k.EVT_SWITCH_TAB, switchTo, "ShowTabFromBL");
            } else {
                console.error('UICore: Show tab called for missing tab ID');
            }
            break;

          case "CreateSelfUpdateDeprecatedBanner":
            console.debug("UICore: inside CreateSelfUpdateDeprecatedBanner");
            var tabId = msgString.xmlData.xmldata.data.TabId;
            SelfUpdateDeprecatedBannerView.setView();
            break;
		
		  case "ApplyStageRedirectedColour":
			$("#topNav").css("backgroundColor", "FireBrick");
			break;		  

          case "UpdateSelfUpdateDeprecatedBanner":
            console.debug("UICore: inside UpdateSelfUpdateDeprecatedBanner");
            SelfUpdateDeprecatedBannerModel.setValue(msgString.xmlData.xmldata.data);
            SelfUpdateDeprecatedBannerView.setView();
            break;

          // To Show Status bar
          case "StatusBar":
            Events.trigger(k.EVT_STATUSBAR_MSG, msgString);
            break;
          case "ShowAlert":
            var action = msgString.xmlData.xmldata.AlertData.visibilityState;
            if ((action === k.NO_NETWORK) || (action === k.SCRIM_SIGNIN) || (action === k.NO_NETWORK_RETRYAFTER)) {
              var $errorView = Alert.getErrorView(msgString);
              if (action === k.SCRIM_SIGNIN || action === k.NO_NETWORK_RETRYAFTER) {
                $errorView.find('.offline').hide();
              }
              Events.trigger(k.CONST.EVT_MODAL_SHOW, {subscriber: k.UICORE_ID, modalId: k.CONST.MODAL_NONETWORK, priority: 1500, $viewEl: $errorView});
            }
            else if (action === k.SHOW_MODAL) {
              var $waitingView = Alert.getWaitingView(msgString);
              Events.trigger(k.CONST.EVT_MODAL_SHOW, {subscriber: k.UICORE_ID, modalId: k.CONST.MODAL_MOVINGFILESSCREEN, priority: 500, $viewEl: $waitingView});
            }
            else if (action === k.HIDE_NO_NETWORK) {
              Events.trigger(k.CONST.EVT_MODAL_HIDE, k.UICORE_ID, k.CONST.MODAL_NONETWORK);
            }
            else if (action === k.HIDE_SHOW_MODAL) {
              Events.trigger(k.CONST.EVT_MODAL_HIDE, k.UICORE_ID, k.CONST.MODAL_MOVINGFILESSCREEN);
            }
            break;
          case "ShowImsErrorDialog":
            var actionIMS = msgString.xmlData.xmldata.AlertData.visibilityState;
            if (actionIMS === k.SCRIM_SIGNIN) {
              var $errorViewIMS = Alert.getIMSErrorView(msgString);
              Events.trigger(k.CONST.EVT_MODAL_SHOW, {subscriber: k.UICORE_ID, modalId: k.CONST.MODAL_IMSERRORSCREEN, priority: 1500, $viewEl: $errorViewIMS});
            }
            else {
              Events.trigger(k.CONST.EVT_MODAL_HIDE, k.UICORE_ID, k.CONST.MODAL_IMSERRORSCREEN);
            }
            break;
          case "ShowWaitingSpinner":
            if (msgString.xmlData.xmldata.isVisible === "true") {
              Events.trigger(k.CONST.EVT_MODAL_SHOW, {subscriber: k.UICORE_ID, modalId: k.CONST.MODAL_WAITINGSPINNER, priority: 500, $viewEl: Alert.getGlobalSpinnerView()});
            }
            else {
              Events.trigger(k.CONST.EVT_MODAL_HIDE, k.UICORE_ID, k.CONST.MODAL_WAITINGSPINNER);
            }
            break;
          case "ShowContinueOfflineBar":
            Events.trigger(k.CONST.EVT_ERRORBAR_SHOW,
              { subscriber: k.UICORE_ID,
                $viewEl: Alert.getContinueOfflineView(msgString),
                isGlobal: true,
                errorFn: function (errObj) {
                  console.error("UICore: Error showing error bar: " + errObj.message);
                }
              });
            break;
          
          case 'ShowBottomBarWithClose':
            var subscriberId = msgString.xmlData.xmldata.barConfig.subscriberId || k.UICORE_ID;
			var subscriberVersion = msgString.xmlData.xmldata.barConfig.subscriberVersion || k.UICORE_VERSION;
            var str = msgString.xmlData.xmldata.barConfig.str;
            var isGlobal = (msgString.xmlData.xmldata.barConfig.isGlobal && msgString.xmlData.xmldata.barConfig.isGlobal == "true") ? true : false
            var warningIcon = (msgString.xmlData.xmldata.barConfig.warningIcon && msgString.xmlData.xmldata.barConfig.warningIcon == "true") ? true : false
            var timeout = (msgString.xmlData.xmldata.barConfig.timeout && NaN != parseInt(msgString.xmlData.xmldata.barConfig.timeout)) ? parseInt(msgString.xmlData.xmldata.barConfig.timeout) : 6000;
            var id = msgString.xmlData.xmldata.barConfig.id || k.UICORE_ID;
            var replace = (msgString.xmlData.xmldata.barConfig.replace && _.isBoolean(msgString.xmlData.xmldata.barConfig.replace)) ? msgString.xmlData.xmldata.barConfig.replace : true;
            var errorTemplate = Alert.getBottomErrorView(str);
            
            Events.trigger(k.CONST.EVT_ERRORBAR_SHOW, {
                subscriberId: subscriberId,
				subscriberVersion: subscriberVersion,
                $viewEl: $(errorTemplate),
                isGlobal: isGlobal,
                warningIcon: warningIcon,
                timeout: timeout,
                id: id,
                replace: replace,
				
                errorFn: function (err) {
                    console.log("Error bar show request rejected: >>", err.message);
                }
            });
            break;
		  case 'RemoveBottomBarWithClose':
            var id = msgString.xmlData.xmldata.barConfig.id || k.UICORE_ID;
            
			Events.trigger(k.CONST.EVT_ERRORBAR_REMOVE, {
                id: id,
                errorFn: function (err) {
                    console.log("Error bar remove request rejected: >>", err.message);
                }
            });
            break;
			// To show/hide Proxy screen
          case "ShowProxy":
            require(['alert/main'], function (proxyObj) {
              var $proxyView = proxyObj.getProxyView(msgString);
              Events.trigger(k.CONST.EVT_MODAL_SHOW, {subscriber: k.UICORE_ID, modalId: k.CONST.MODAL_PROXYSCREEN, priority: 1500, $viewEl: $proxyView});
            });
            break;

          // To show/hide SelfUpdateDeprecatedBanner
          case "ShowSelfUpdateDeprecatedBanner":
            if (msgString.xmlData.xmldata.isVisible === "true") {
              SelfUpdateDeprecatedBannerView.showView();
            }
            else {
              SelfUpdateDeprecatedBannerView.hideView();
            }
            break;

          // First message to create the DOM structure of the panels
          case k.MSG_TYPE_CREATE_VIEW:
            SelfUpdateDeprecatedBannerModel.setValue(msgString.xmlData.xmldata);
            Events.trigger(k.CONST.EVT_MODAL_SHOW, {subscriber: k.UICORE_ID, modalId: k.CONST.MODAL_WAITINGSPINNER, priority: 500, $viewEl: Alert.getGlobalSpinnerView()});
            CoreUtils.layout(msgString.xmlData.xmldata);
            Session.locale = msgString.xmlData.xmldata.locale;
            break;

          case k.MSG_TYPE_CREATE_GENERAL_PREFERENCES_VIEW:
            if (!is_PREFERENCE_PANEL_READY) {
              showPrefViewOnPanelReadyEvent = true;
              configData = msgString.xmlData.xmldata.data;
              return;
            }

            if (!GeneralPreferencesView.isAttached()) {
              GeneralPreferencesView.render(msgString.xmlData.xmldata.data);
            }
            break;

          case k.MSG_TYPE_CREATE_PREFERENCES_VIEW:
            require(['preferences/main'], function (preferences) {
              var prefXmlData = msgString.xmlData.xmldata.preferenceXmlData;
              preferences.init(prefXmlData.config, prefXmlData.preferencesWindowTitle);
            });
            break;

          case k.MSG_TYPE_HIDE_PREFERENCES_VIEW:
            Events.trigger(k.CONST.EVT_TOPNAV_BACK_CLICK);
            break;

          case k.MSG_TYPE_SHOWING_PREF_VIEW:
            // Show the preference view
            require(['preferences/main'], function (preferences) {
              preferences.showView();
            });

            //Update the General Pref View.
            GeneralPreferencesView.updateNotification(msgString.xmlData.xmldata.data);
            break;

          case k.MSG_TYPE_SHOWING_PANEL_PREF:
            // Show the preference view
            require(['preferences/main'], function (preferences) {
              preferences.switchToPanelPref(msgString.xmlData.xmldata.applet);
            });

            break;

          case k.MSG_TYPE_UPDATE_ALWAYS_UPTODATE_CHECKBOX:
            GeneralPreferencesView.updateAlwaysUpToDateCheckBox(msgString.xmlData.xmldata.message);
            break;

          case "ManageGeneralPreferences":
            GeneralPreferencesView.handleGeneralPreferences(msgString);
            break;

          case "SelfUpdate":
            Alert.handleSelfUpdate(msgString);
            break;

          case "handleAEMWorkflow":
            Alert.handleAEMWorkflow(msgString);
            break;

          case "PinToMenu":
            if (msgString.xmlData.xmldata.isPin === "true") {
              $('#topNav').addClass('mac_pin');
            } else {
              $('#topNav').removeClass('mac_pin');
            }
            break;

          case "UserContextData":
            break;
          default:
            console.error("UICore: UNHANDLED CASE IN ccApp/main for UICore- ", reqType);
            break;
        }
      }
      else if (targetId === k.HEX_ID) {
        switch (reqType) {
          case k.MSG_TYPE_SHOW_VIEW:
            console.debug("UICore: Inside ShowView");
            var mode = msgString.xmlData.xmldata.data.mode;
            if (mode && (mode === 'signIn')) {
              $('#' + k.CONTENT_ID).hide();
            }
            else {
              $('#' + k.CONTENT_ID).show();
            }
            break;
        }
      }
      else {
        // send message to respective panel | or trigger event for panel
        _.delay(function () {
          Events.trigger(targetId, {msg: msgString, type: reqType});
        }, 1);
      }
    }
  };
});
