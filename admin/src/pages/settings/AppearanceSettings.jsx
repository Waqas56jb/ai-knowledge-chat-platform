import { Controller } from 'react-hook-form';
import { z } from 'zod';
import { Monitor, Moon, Palette, PanelLeftClose, PanelLeftOpen, Rows3, Rows4, Sun } from 'lucide-react';
import { clearSidebarPreference } from '../../services/settingsService';
import { useDocumentTitle } from '../../hooks/useMisc';
import { SettingsFormCard, SettingRow, RadioCards } from '../../components/settings/SettingsForm';
import { useSettingsForm } from '../../components/settings/useSettingsForm';
import { ThemePreview, SidebarPreview, DensityPreview } from '../../components/settings/AppearancePreviews';

const schema = z.object({
  theme: z.enum(['light', 'dark', 'system']),
  sidebar: z.enum(['expanded', 'collapsed']),
  density: z.enum(['comfortable', 'compact'])
});

const THEMES = [
  { value: 'light', label: 'Light', description: 'Warm ivory surfaces.', icon: Sun, preview: <ThemePreview theme="light" /> },
  { value: 'dark', label: 'Dark', description: 'Noir surfaces, easy at night.', icon: Moon, preview: <ThemePreview theme="dark" /> },
  { value: 'system', label: 'System', description: 'Match the device setting.', icon: Monitor, preview: <ThemePreview theme="system" /> }
];
const SIDEBAR = [
  { value: 'expanded', label: 'Expanded', description: 'Icons and labels.', icon: PanelLeftOpen, preview: <SidebarPreview /> },
  { value: 'collapsed', label: 'Collapsed', description: 'Icons only, more room.', icon: PanelLeftClose, preview: <SidebarPreview collapsed /> }
];
const DENSITY = [
  { value: 'comfortable', label: 'Comfortable', description: 'Default spacing and type size.', icon: Rows3, preview: <DensityPreview /> },
  { value: 'compact', label: 'Compact', description: 'Slightly smaller text.', icon: Rows4, preview: <DensityPreview compact /> }
];

const FIELDS = [
  ['theme', 'Theme', 'Applied as soon as you save. “System” follows your device’s light or dark preference when the page loads.', THEMES, 3],
  ['sidebar', 'Sidebar default', 'Takes effect on your next refresh or sign-in. Saving clears the sidebar toggle remembered by this browser so the default applies.', SIDEBAR, 2],
  ['density', 'Density', 'Applied as soon as you save.', DENSITY, 2]
];

export default function AppearanceSettings() {
  useDocumentTitle('Appearance settings');
  // updateSettings('appearance') applies theme + density immediately; the sidebar default needs the
  // remembered manual toggle cleared to take effect on the next load.
  const state = useSettingsForm('appearance', schema, { onSaved: clearSidebarPreference });
  const { control } = state.form;

  return (
    <SettingsFormCard state={state} icon={Palette} title="Appearance" description="Personal display preferences for this browser.">
      {FIELDS.map(([name, label, description, options, columns]) => (
        <SettingRow key={name} label={label} description={description} group>
          <Controller control={control} name={name} render={({ field }) => (
            <RadioCards name={field.name} value={field.value} onChange={field.onChange} options={options} columns={columns} />
          )} />
        </SettingRow>
      ))}
    </SettingsFormCard>
  );
}
