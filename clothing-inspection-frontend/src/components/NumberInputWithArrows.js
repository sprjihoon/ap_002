import React from 'react';
import { Box, IconButton, InputBase } from '@mui/material';
import ArrowDropUpIcon from '@mui/icons-material/ArrowDropUp';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

/**
 * Numeric input with vertical ▲▼ arrows on the right, styled to mimic
 * the design mock-up used in InspectionRegister dialog.
 *
 * Props:
 *  - value: current value (number | string)
 *  - onChange: (newValue) => void
 *  - min: minimum allowed value (default 0)
 *  - max: optional maximum value
 *  - width: component width (default 120)
 *  - height: component height (default 56)
 *  - fontSize: numeric font size (default 28)
 */
const NumberInputWithArrows = ({
  value,
  onChange,
  min = 0,
  max,
  width = 90,
  height = 56,
  fontSize = 22,
  error=false,
  ...rest
}) => {
  const valNum = Number(value) || 0;
  const handleInc = () => {
    const next = max !== undefined ? Math.min(max, valNum + 1) : valNum + 1;
    onChange(next);
  };
  const handleDec = () => {
    const next = Math.max(min, valNum - 1);
    onChange(next);
  };
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'stretch',
        border: error ? '2px solid #d32f2f' : '1px solid #c8c8c8',
        borderRadius: 2,
        overflow: 'hidden',
        width,
        height,
        backgroundColor: '#fff'
      }}
    >
      {/* Numeric input area */}
      <InputBase
        type="number"
        value={value}
        onChange={e => onChange(e.target.value)}
        inputMode="numeric"
        sx={{
          flex: 1,
          textAlign: 'center',
          fontSize,
          px: 1,
          '& input': { textAlign: 'center' }
        }}
        {...rest}
      />
      {/* Arrow buttons */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          borderLeft: '1px solid #c8c8c8',
          width: 40
        }}
      >
        <IconButton onClick={handleInc} size="small" sx={{ flex: 1 }}>
          <ArrowDropUpIcon fontSize="small" />
        </IconButton>
        <IconButton onClick={handleDec} size="small" sx={{ flex: 1 }}>
          <ArrowDropDownIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default NumberInputWithArrows; 