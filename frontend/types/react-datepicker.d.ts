declare module 'react-datepicker' {
  import * as React from 'react';

  export interface ReactDatePickerProps extends React.HTMLProps<HTMLElement> {
    selected?: Date | null;
    onChange?: (date: Date | null) => void;
    showMonthDropdown?: boolean;
    showYearDropdown?: boolean;
    showTimeSelect?: boolean;
    timeIntervals?: number;
    dateFormat?: string;
    minDate?: Date;
    showMonthYearPicker?: boolean;
  }

  const DatePicker: React.FC<ReactDatePickerProps>;
  export default DatePicker;
}


