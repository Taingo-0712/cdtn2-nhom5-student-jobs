export const statusLabels = {
  RECRUITING: 'Đang tuyển',
  FILLED: 'Đã nhận người',
  COMPLETED: 'Hoàn thành',
};

const salaryUnits = {
  HOUR: 'giờ',
  DAY: 'ngày',
  SHIFT: 'ca',
  MONTH: 'tháng',
};

const numberFormat = new Intl.NumberFormat('vi-VN', {
  maximumFractionDigits: 2,
});

export function formatJobSalary(job) {
  const min = numberFormat.format(job.salary_min);
  const max = numberFormat.format(job.salary_max);
  const amount = min === max ? min : `${min}–${max}`;
  const unit = salaryUnits[job.salary_unit] ?? job.salary_unit;

  return `${amount} đ/${unit}`;
}