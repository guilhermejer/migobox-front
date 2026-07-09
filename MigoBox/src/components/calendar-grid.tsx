import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];

type Props = {
  year: number;
  month: number;
  markedDates: Set<string>;
  selectedDate: string | null;
  onDatePress: (dateStr: string) => void;
};

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function CalendarGrid({ year, month, markedDates, selectedDate, onDatePress }: Props) {
  const todayStr = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }, []);

  const { firstWeekday, daysInMonth, totalCells } = useMemo(() => {
    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const cells = Math.ceil((first + days) / 7) * 7;
    return { firstWeekday: first, daysInMonth: days, totalCells: cells };
  }, [year, month]);

  const cells = useMemo(() => {
    const result: { day: number; dateStr: string; isOutside: boolean }[] = [];
    for (let i = 0; i < totalCells; i++) {
      const day = i - firstWeekday + 1;
      const isOutside = day < 1 || day > daysInMonth;
      const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
      result.push({ day, dateStr, isOutside });
    }
    return result;
  }, [firstWeekday, daysInMonth, totalCells, year, month]);

  return (
    <View style={styles.wrapper}>
      <View style={styles.weekdayRow}>
        {WEEKDAYS.map((w) => (
          <View key={w} style={styles.weekdayCell}>
            <Text style={styles.weekdayText}>{w}</Text>
          </View>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((cell) => {
          if (cell.isOutside) {
            return <View key={cell.dateStr} style={styles.cell} />;
          }

          const isToday = cell.dateStr === todayStr;
          const isSelected = cell.dateStr === selectedDate;
          const hasMark = markedDates.has(cell.dateStr);

          return (
            <TouchableOpacity
              key={cell.dateStr}
              style={styles.cell}
              activeOpacity={0.6}
              onPress={() => onDatePress(cell.dateStr)}>
              <View
                style={[
                  styles.dayWrap,
                  isSelected && styles.daySelected,
                  isToday && !isSelected && styles.dayToday,
                ]}>
                <Text
                  style={[
                    styles.dayText,
                    isSelected && styles.dayTextSelected,
                    isToday && !isSelected && styles.dayTextToday,
                  ]}>
                  {cell.day}
                </Text>
              </View>
              {hasMark && <View style={styles.dot} />}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#ECECEC',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  weekdayText: {
    color: '#9AA3AD',
    fontSize: 11,
    fontFamily: 'Nunito_800ExtraBold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
  },
  dayWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: {
    backgroundColor: '#1CB0F6',
  },
  dayToday: {
    backgroundColor: '#1CB0F611',
  },
  dayText: {
    color: '#2D3436',
    fontSize: 14,
    fontFamily: 'Nunito_800ExtraBold',
  },
  dayTextSelected: {
    color: '#FFFFFF',
  },
  dayTextToday: {
    color: '#1CB0F6',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF9600',
    position: 'absolute',
    bottom: 2,
  },
});
