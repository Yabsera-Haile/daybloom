import DateTimePicker from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { View } from 'react-native';

import { t } from '@/i18n';
import { useTheme } from '@/theme';

import { Button } from './Button';
import { usePickerRequest, type PickerRequest } from './pickers';
import { Sheet } from './Sheet';

function PickerSheet({ request }: { request: PickerRequest }) {
  const { colors } = useTheme();
  const set = usePickerRequest((s) => s.set);
  const [value, setValue] = useState(request.value);
  const finish = (date: Date | null) => {
    set(null);
    request.resolve(date);
  };
  return (
    <Sheet
      visible
      onClose={() => finish(null)}
      title={request.mode === 'date' ? t.pickers.chooseDay : t.pickers.chooseTime}
      closeButton>
      <View className="items-center gap-space-md pb-space-sm">
        <DateTimePicker
          value={value}
          mode={request.mode}
          display={request.mode === 'date' ? 'inline' : 'spinner'}
          accentColor={colors.primary}
          textColor={colors.onSurface}
          themeVariant="light"
          onChange={(_event, date) => date && setValue(date)}
        />
        <Button label={t.common.done} fullWidth onPress={() => finish(value)} />
      </View>
    </Sheet>
  );
}

/** Answers pickDay / pickTime on iPhone with Apple's own inline pickers in a sheet (Android uses dialogs). */
export function PickerHost() {
  const request = usePickerRequest((s) => s.request);
  return request ? <PickerSheet key={`${request.mode}${request.value.getTime()}`} request={request} /> : null;
}
