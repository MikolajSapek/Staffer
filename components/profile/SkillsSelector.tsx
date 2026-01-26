'use client';

import { Label } from '@/components/ui/label';

interface SkillsSelectorProps {
  availableSkills: Array<{ id: string; name: string; category: 'language' | 'license' }>;
  selectedSkillIds: string[];
  skillsLoading: boolean;
  submitLoading: boolean;
  onSkillToggle: (skillId: string) => void;
}

export default function SkillsSelector({
  availableSkills,
  selectedSkillIds,
  skillsLoading,
  submitLoading,
  onSkillToggle,
}: SkillsSelectorProps) {
  if (skillsLoading) {
    return (
      <div className="space-y-4">
        <div className="border-b pb-2">
          <h3 className="text-lg font-semibold">Skills & Qualifications</h3>
          <p className="text-sm text-muted-foreground">Select your languages and licenses</p>
        </div>
        <div className="py-4 text-center text-muted-foreground">
          <p>Loading skills...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border-b pb-2">
        <h3 className="text-lg font-semibold">Skills & Qualifications</h3>
        <p className="text-sm text-muted-foreground">Select your languages and licenses</p>
      </div>

      <div className="space-y-4">
        {/* Languages */}
        {availableSkills.filter(s => s.category === 'language').length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Languages</Label>
            <div className="grid gap-3 md:grid-cols-2">
              {availableSkills
                .filter((skill) => skill.category === 'language')
                .map((skill) => (
                  <label
                    key={skill.id}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSkillIds.includes(skill.id)}
                      onChange={() => onSkillToggle(skill.id)}
                      disabled={submitLoading}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm">{skill.name}</span>
                  </label>
                ))}
            </div>
          </div>
        )}

        {/* Licenses - HIDDEN FOR NOW (business decision) */}
        {false && availableSkills.filter(s => s.category === 'license').length > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Licenses</Label>
            <div className="grid gap-3 md:grid-cols-2">
              {availableSkills
                .filter((skill) => skill.category === 'license')
                .map((skill) => (
                  <label
                    key={skill.id}
                    className="flex items-center space-x-2 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSkillIds.includes(skill.id)}
                      onChange={() => onSkillToggle(skill.id)}
                      disabled={submitLoading}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <span className="text-sm">{skill.name}</span>
                  </label>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
