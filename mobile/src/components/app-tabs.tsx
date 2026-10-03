import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { DexTheme } from '@/constants/dexTheme';

export default function AppTabs() {
  return (
    <NativeTabs
      backgroundColor="#900015"
      indicatorColor="#DC0A2D"
      labelStyle={{
        default: { color: 'rgba(255, 255, 255, 0.7)' },
        selected: { color: '#FFFFFF' },
      }}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Scanner</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="explore">
        <NativeTabs.Trigger.Label>Zoodex</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
