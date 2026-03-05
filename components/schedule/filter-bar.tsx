import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/colors';

interface FilterOption {
  value: string;
  label: string;
}

interface FilterBarProps {
  centers: FilterOption[];
  instructors: FilterOption[];
  categories: FilterOption[];
  selectedCenter: string | null;
  selectedInstructor: string | null;
  selectedCategory: string | null;
  onCenterChange: (value: string | null) => void;
  onInstructorChange: (value: string | null) => void;
  onCategoryChange: (value: string | null) => void;
}

export function FilterBar({
  centers,
  instructors,
  categories,
  selectedCenter,
  selectedInstructor,
  selectedCategory,
  onCenterChange,
  onInstructorChange,
  onCategoryChange,
}: FilterBarProps) {
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);

  const hasActiveFilters = selectedCenter || selectedInstructor || selectedCategory;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <FilterChip
          label="Center"
          value={centers.find((c) => c.value === selectedCenter)?.label}
          active={!!selectedCenter}
          onPress={() => setActiveDropdown('center')}
        />
        <FilterChip
          label="Instructor"
          value={instructors.find((i) => i.value === selectedInstructor)?.label}
          active={!!selectedInstructor}
          onPress={() => setActiveDropdown('instructor')}
        />
        <FilterChip
          label="Type"
          value={categories.find((c) => c.value === selectedCategory)?.label}
          active={!!selectedCategory}
          onPress={() => setActiveDropdown('category')}
        />
        {hasActiveFilters && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={() => {
              onCenterChange(null);
              onInstructorChange(null);
              onCategoryChange(null);
            }}
          >
            <Ionicons name="close-circle" size={16} color={Colors.textTertiary} />
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Center dropdown */}
      <FilterDropdown
        visible={activeDropdown === 'center'}
        options={centers}
        selected={selectedCenter}
        onSelect={(v) => {
          onCenterChange(v);
          setActiveDropdown(null);
        }}
        onClose={() => setActiveDropdown(null)}
      />

      {/* Instructor dropdown */}
      <FilterDropdown
        visible={activeDropdown === 'instructor'}
        options={instructors}
        selected={selectedInstructor}
        onSelect={(v) => {
          onInstructorChange(v);
          setActiveDropdown(null);
        }}
        onClose={() => setActiveDropdown(null)}
      />

      {/* Category dropdown */}
      <FilterDropdown
        visible={activeDropdown === 'category'}
        options={categories}
        selected={selectedCategory}
        onSelect={(v) => {
          onCategoryChange(v);
          setActiveDropdown(null);
        }}
        onClose={() => setActiveDropdown(null)}
      />
    </View>
  );
}

function FilterChip({
  label,
  value,
  active,
  onPress,
}: {
  label: string;
  value?: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.chip, active && styles.chipActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
        {value || label}
      </Text>
      <Ionicons
        name="chevron-down"
        size={14}
        color={active ? Colors.cream : Colors.textSecondary}
      />
    </TouchableOpacity>
  );
}

function FilterDropdown({
  visible,
  options,
  selected,
  onSelect,
  onClose,
}: {
  visible: boolean;
  options: FilterOption[];
  selected: string | null;
  onSelect: (value: string | null) => void;
  onClose: () => void;
}) {
  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.dropdown}>
          <TouchableOpacity
            style={[styles.dropdownItem, !selected && styles.dropdownItemActive]}
            onPress={() => onSelect(null)}
          >
            <Text
              style={[
                styles.dropdownText,
                !selected && styles.dropdownTextActive,
              ]}
            >
              All
            </Text>
            {!selected && (
              <Ionicons name="checkmark" size={18} color={Colors.accent} />
            )}
          </TouchableOpacity>

          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              style={[
                styles.dropdownItem,
                selected === opt.value && styles.dropdownItemActive,
              ]}
              onPress={() => onSelect(opt.value)}
            >
              <Text
                style={[
                  styles.dropdownText,
                  selected === opt.value && styles.dropdownTextActive,
                ]}
                numberOfLines={1}
              >
                {opt.label}
              </Text>
              {selected === opt.value && (
                <Ionicons name="checkmark" size={18} color={Colors.accent} />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingBottom: 4,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
    alignItems: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 2,
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  chipText: {
    fontFamily: 'Jost',
    fontSize: 12,
    fontWeight: '300',
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    maxWidth: 100,
  },
  chipTextActive: {
    color: Colors.cream,
  },
  clearButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  clearText: {
    fontFamily: 'Jost-Light',
    fontSize: 13,
    color: Colors.textTertiary,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  dropdown: {
    backgroundColor: Colors.surface,
    borderRadius: 2,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    maxHeight: 400,
  },
  dropdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  dropdownItemActive: {
    backgroundColor: Colors.sandLight,
  },
  dropdownText: {
    fontFamily: 'Jost-Light',
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  dropdownTextActive: {
    fontWeight: '700',
    color: Colors.accent,
  },
});
