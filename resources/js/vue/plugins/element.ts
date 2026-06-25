import type { App } from 'vue';
import {
  ElAlert,
  ElButton,
  ElCard,
  ElCol,
  ElDialog,
  ElForm,
  ElFormItem,
  ElInput,
  ElLoading,
  ElPopover,
  ElRadio,
  ElRadioGroup,
  ElResult,
  ElRow,
  ElSpace,
  ElSwitch,
  ElTabPane,
  ElTabs,
  ElTag,
} from 'element-plus';

import 'element-plus/es/components/alert/style/css';
import 'element-plus/es/components/button/style/css';
import 'element-plus/es/components/card/style/css';
import 'element-plus/es/components/col/style/css';
import 'element-plus/es/components/dialog/style/css';
import 'element-plus/es/components/form/style/css';
import 'element-plus/es/components/form-item/style/css';
import 'element-plus/es/components/input/style/css';
import 'element-plus/es/components/loading/style/css';
import 'element-plus/es/components/message/style/css';
import 'element-plus/es/components/message-box/style/css';
import 'element-plus/es/components/popover/style/css';
import 'element-plus/es/components/radio/style/css';
import 'element-plus/es/components/radio-group/style/css';
import 'element-plus/es/components/result/style/css';
import 'element-plus/es/components/row/style/css';
import 'element-plus/es/components/space/style/css';
import 'element-plus/es/components/switch/style/css';
import 'element-plus/es/components/tab-pane/style/css';
import 'element-plus/es/components/tabs/style/css';
import 'element-plus/es/components/tag/style/css';

export function installElementPlus(app: App) {
  app.component(ElAlert.name, ElAlert);
  app.component(ElButton.name, ElButton);
  app.component(ElCard.name, ElCard);
  app.component(ElCol.name, ElCol);
  app.component(ElDialog.name, ElDialog);
  app.component(ElForm.name, ElForm);
  app.component(ElFormItem.name, ElFormItem);
  app.component(ElInput.name, ElInput);
  app.component(ElPopover.name, ElPopover);
  app.component(ElRadio.name, ElRadio);
  app.component(ElRadioGroup.name, ElRadioGroup);
  app.component(ElResult.name, ElResult);
  app.component(ElRow.name, ElRow);
  app.component(ElSpace.name, ElSpace);
  app.component(ElSwitch.name, ElSwitch);
  app.component(ElTabPane.name, ElTabPane);
  app.component(ElTabs.name, ElTabs);
  app.component(ElTag.name, ElTag);
  app.use(ElLoading);
}
