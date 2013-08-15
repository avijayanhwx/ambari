/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var App = require('app');
App.MainAdminSecurityController = Em.Controller.extend({
  name: 'mainAdminSecurityController',
  isSubmitDisabled: false,
  securityEnabled: false,
  dataIsLoaded: false,
  serviceUsers: [],
  tag: {},
  getAddSecurityWizardStatus: function () {
    return App.db.getSecurityWizardStatus();
  },
  setAddSecurityWizardStatus: function (status) {
    App.db.setSecurityWizardStatus(status);
  },

  setDisableSecurityStatus: function (status) {
    App.db.setDisableSecurityStatus(status);
  },
  getDisableSecurityStatus: function (status) {
    return App.db.getDisableSecurityStatus();
  },

  notifySecurityOff: false,
  notifySecurityAdd: false,

  notifySecurityOffPopup: function () {
    var self = this;
    if (!this.get('isSubmitDisabled')) {
      App.ModalPopup.show({
        header: Em.I18n.t('popup.confirmation.commonHeader'),
        primary: Em.I18n.t('ok'),
        onPrimary: function () {
          App.db.setSecurityDeployStages(undefined);
          self.setDisableSecurityStatus("RUNNING");
          App.router.transitionTo('disableSecurity');
          this.hide();
        },
        bodyClass: Ember.View.extend({
          isMapReduceInstalled: App.Service.find().mapProperty('serviceName').contains('MAPREDUCE'),
          template: Ember.Handlebars.compile([
            '<div class="alert">',
            '{{t admin.security.disable.popup.body}}',
            '{{#if view.isMapReduceInstalled}}',
            '<br>',
            '{{t admin.security.disable.popup.body.warning}}',
            '{{/if}}',
            '</div>'
          ].join('\n'))
        })
      })
    }
  },

  getUpdatedSecurityStatus: function () {
    this.setSecurityStatus();
    return this.get('securityEnabled');
  },

  setSecurityStatus: function () {
    if (App.testMode) {
      this.set('securityEnabled', !App.testEnableSecurity);
      this.set('dataIsLoaded', true);
    } else {
      //get Security Status From Server
      App.ajax.send({
        name: 'admin.security_status',
        sender: this,
        success: 'getSecurityStatusFromServerSuccessCallback',
        error: 'errorCallback'
      });
    }
  },

  errorCallback: function () {
    this.set('dataIsLoaded', true);
    this.showSecurityErrorPopup();
  },

  getSecurityStatusFromServerSuccessCallback: function (data) {
    var configs = data.Clusters.desired_configs;
    if ('global' in configs && 'hdfs-site' in configs) {
      this.set('tag.global', configs['global'].tag);
      this.set('tag.hdfs-site', configs['hdfs-site'].tag);
      this.getServiceConfigsFromServer();
    }
    else {
      this.showSecurityErrorPopup();
    }
  },

  getServiceConfigsFromServer: function () {
    var urlParams = [];
    urlParams.push('(type=global&tag=' + this.get('tag.global') + ')');
    urlParams.push('(type=hdfs-site&tag=' + this.get('tag.hdfs-site') + ')');
    App.ajax.send({
      name: 'admin.security.all_configurations',
      sender: this,
      data: {
        urlParams: urlParams.join('|')
      },
      success: 'getServiceConfigsFromServerSuccessCallback',
      error: 'errorCallback'
    });
  },

  getServiceConfigsFromServerSuccessCallback: function (data) {
    console.log("TRACE: In success function for the GET getServiceConfigsFromServer call");
    var configs = data.items.findProperty('tag', this.get('tag.global')).properties;
    if (configs && (configs['security_enabled'] === 'true' || configs['security_enabled'] === true)) {
      this.set('securityEnabled', true);
    }
    else {
      this.set('securityEnabled', false);
      var hdfsConfigs = data.items.findProperty('tag', this.get('tag.hdfs-site')).properties;
      this.setNnHaStatus(hdfsConfigs);
    }
    this.loadUsers(configs);
    this.set('dataIsLoaded', true);
  },

  setNnHaStatus: function(hdfsConfigs) {
    var nnHaStatus = hdfsConfigs && hdfsConfigs['dfs.nameservices'];
    var namenodes;
    if (nnHaStatus) {
      namenodesKey = 'dfs.ha.namenodes.' + hdfsConfigs['dfs.nameservices'];
    }
    if(nnHaStatus && hdfsConfigs[namenodesKey]) {
      App.db.setIsNameNodeHa('true');
    } else {
      App.db.setIsNameNodeHa('false');
    }
  },

  loadUsers: function (configs) {
    var serviceUsers = this.get('serviceUsers');
    serviceUsers.pushObject({
      id: 'puppet var',
      name: 'hdfs_user',
      value: configs['hdfs_user'] ? configs['hdfs_user'] : 'hdfs'
    });
    serviceUsers.pushObject({
      id: 'puppet var',
      name: 'yarn_user',
      value: configs['yarn_user'] ? configs['yarn_user'] : 'yarn'
    });
    serviceUsers.pushObject({
      id: 'puppet var',
      name: 'mapred_user',
      value: configs['mapred_user'] ? configs['mapred_user'] : 'mapred'
    });
    serviceUsers.pushObject({
      id: 'puppet var',
      name: 'hbase_user',
      value: configs['hbase_user'] ? configs['hbase_user'] : 'hbase'
    });
    serviceUsers.pushObject({
      id: 'puppet var',
      name: 'hive_user',
      value: configs['hive_user'] ? configs['hive_user'] : 'hive'
    });
    serviceUsers.pushObject({
      id: 'puppet var',
      name: 'proxyuser_group',
      value: configs['proxyuser_group'] ? configs['proxyuser_group'] : 'users'
    });
    serviceUsers.pushObject({
      id: 'puppet var',
      name: 'smokeuser',
      value: configs['smokeuser'] ? configs['smokeuser'] : 'ambari-qa'
    });
    serviceUsers.pushObject({
      id: 'puppet var',
      name: 'zk_user',
      value: configs['zk_user'] ? configs['zk_user'] : 'zookeeper'
    });
    serviceUsers.pushObject({
      id: 'puppet var',
      name: 'oozie_user',
      value: configs['oozie_user'] ? configs['oozie_user'] : 'oozie'
    });
    serviceUsers.pushObject({
      id: 'puppet var',
      name: 'nagios_user',
      value: configs['nagios_user'] ? configs['nagios_user'] : 'nagios'
    });
    serviceUsers.pushObject({
      id: 'puppet var',
      name: 'user_group',
      value: configs['user_group'] ? configs['user_group'] : 'hadoop'
    });
  },

  showSecurityErrorPopup: function () {
    App.ModalPopup.show({
      header: Em.I18n.t('common.error'),
      secondary: false,
      onPrimary: function () {
        this.hide();
      },
      bodyClass: Ember.View.extend({
        template: Ember.Handlebars.compile('<p>{{t admin.security.status.error}}</p>')
      })
    });
  }
});


