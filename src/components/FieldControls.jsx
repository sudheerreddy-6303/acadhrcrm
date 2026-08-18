// Shared form controls + option lists for the Tutor / Teacher add forms.

// Default option sets — edit these lists to match your platform's real values.
export const SUBJECTS = [
  // Entrance / competitive
  'NEET', 'JEE', 'IPMAT', 'Foundation',
  // Core subjects (Class 1 to Intermediate)
  'Maths', 'Physics', 'Chemistry', 'Biology', 'Botany', 'Zoology', 'Science',
  'Social Studies', 'History', 'Civics', 'Geography',
  'Economics', 'Commerce', 'Accountancy', 'Business Studies',
  'Computer Science', 'EVS',
  // Languages
  'English', 'Hindi', 'Telugu', 'Sanskrit',
];

// Entrance/competitive tracks shown separately from regular subjects.
export const COURSES = ['NEET', 'JEE', 'IPMAT', 'Foundation'];
export const BOARDS = ['CBSE', 'ICSE', 'State Board', 'IGCSE', 'IB'];
export const CLASSES = ['Class 1-5', 'Class 6-8', 'Class 9-10', 'Class 11-12', 'UG / Degree'];
export const TIMINGS = ['Morning', 'Afternoon', 'Evening', 'Night', 'Weekends'];
export const EXPERIENCE = ['0-1 years', '1-3 years', '3-5 years', '5-10 years', '10+ years'];

// Clickable chip multi-select. When `max` is set, unselected chips disable
// once the limit is reached (e.g. subjects/boards/classes are capped at 3).
export function ChipMultiSelect({ options, value = [], onChange, max = null }) {
  const toggle = (opt) => {
    if (value.includes(opt)) {
      onChange(value.filter((v) => v !== opt));
    } else {
      if (max && value.length >= max) return;
      onChange([...value, opt]);
    }
  };

  const limitReached = max && value.length >= max;

  return (
    <div className="chip-select">
      {options.map((opt) => {
        const selected = value.includes(opt);
        const disabled = !selected && limitReached;
        return (
          <button
            type="button"
            key={opt}
            className={`chip ${selected ? 'on' : ''}`}
            disabled={disabled}
            onClick={() => toggle(opt)}
          >
            {opt}
          </button>
        );
      })}
      {max && (
        <span className="chip-hint">{value.length}/{max} selected</span>
      )}
    </div>
  );
}

// State + city option lists for the School form dropdowns.
// Edit CITIES to match the cities you actually operate in.
export const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa',
  'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala',
  'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland',
  'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura',
  'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
  'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry',
];

export const CITIES = [
  'Hyderabad', 'Secunderabad', 'Warangal', 'Karimnagar', 'Nizamabad',
  'Vijayawada', 'Visakhapatnam', 'Guntur', 'Tirupati',
  'Bengaluru', 'Chennai', 'Mumbai', 'Pune', 'Delhi', 'Kolkata',
  'Ahmedabad', 'Jaipur', 'Lucknow', 'Kochi', 'Coimbatore', 'Nagpur', 'Indore', 'Bhopal',
];
