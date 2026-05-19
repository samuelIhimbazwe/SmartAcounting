import React from 'react';
import {View, StyleSheet} from 'react-native';
import Svg, {Rect, Text as SvgText} from 'react-native-svg';

type Point = {label: string; value: number};

type Props = {
  data: Point[];
  height?: number;
  barColor?: string;
};

export function SimpleBarChart({
  data,
  height = 160,
  barColor = '#1B6FDB',
}: Props) {
  const width = 320;
  const max = Math.max(...data.map(d => d.value), 1);
  const barW = Math.max(8, width / Math.max(data.length, 1) - 4);

  return (
    <View style={styles.wrap}>
      <Svg width={width} height={height}>
        {data.map((d, i) => {
          const h = (d.value / max) * (height - 24);
          const x = i * (barW + 4) + 4;
          const y = height - h - 16;
          return (
            <React.Fragment key={d.label}>
              <Rect x={x} y={y} width={barW} height={h} fill={barColor} rx={2} />
              <SvgText
                x={x + barW / 2}
                y={height - 2}
                fontSize="8"
                fill="#64748B"
                textAnchor="middle">
                {d.label.slice(5)}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {alignItems: 'center', marginVertical: 8},
});
