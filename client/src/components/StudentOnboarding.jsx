import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building2,
  Briefcase,
  GraduationCap,
  Globe,
  MapPin,
  Clock,
  Calendar,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  X,
} from 'lucide-react';
import config from '../config';

const StudentOnboarding = ({ onComplete, user }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    preferredCareerSectors: [],
    preferredJobRoles: [],
    futurePlan: '',
    careerGoals: '',
    skillsToDevelop: [],
    preferredWorkMode: 'Remote',
    preferredCompanyType: [],
    hobbies: [],
    eventTypesInterested: [],
    availabilityPreferences: [],
    willingnessToTravel: '',
    preferredLearningStyle: '',
    peerGroups: [],
  });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [rawHobbiesText, setRawHobbiesText] = useState('');
  const [rawSkillsText, setRawSkillsText] = useState('');

  // Validation Logic
  const validateField = (field, value) => {
    const isEmpty = (v) =>
      !v || (Array.isArray(v) && v.length === 0) || (typeof v === 'string' && v.trim() === '');

    switch (field) {
      case 'preferredCareerSectors':
      case 'preferredJobRoles':
      case 'preferredCompanyType':
      case 'eventTypesInterested':
      case 'availabilityPreferences':
        return isEmpty(value) ? 'Please select at least one option' : '';
      case 'futurePlan':
      case 'willingnessToTravel':
      case 'preferredLearningStyle':
        return isEmpty(value) ? 'Please choose an option' : '';
      case 'careerGoals':
        return isEmpty(value) ? 'This field is required' : '';
      default:
        return '';
    }
  };

  const validateStep = (step) => {
    const stepFields = {
      1: [
        'preferredCareerSectors',
        'preferredJobRoles',
        'futurePlan',
        'careerGoals',
        'preferredCompanyType',
      ],
      2: ['eventTypesInterested', 'availabilityPreferences', 'willingnessToTravel'],
      3: ['preferredLearningStyle', 'skillsToDevelop'],
    };

    const currentFields = stepFields[step] || [];
    const newErrors = {};
    let isValid = true;

    currentFields.forEach((field) => {
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
        isValid = false;
      }
    });

    setErrors((prev) => ({ ...prev, ...newErrors }));
    setTouched((prev) => ({
      ...prev,
      ...currentFields.reduce((acc, field) => ({ ...acc, [field]: true }), {}),
    }));

    if (!isValid) {
      toast.error('Please fill in all required fields to proceed');
    }

    return isValid;
  };

  // Handlers
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleMultiSelect = (field, value) => {
    setFormData((prev) => {
      const currentArray = prev[field] || [];
      const newArray = currentArray.includes(value)
        ? currentArray.filter((item) => item !== value)
        : [...currentArray, value];

      const newData = {
        ...prev,
        [field]: newArray,
      };

      // If career sectors changed, reset job roles
      if (field === 'preferredCareerSectors') {
        const availableRoles = getAvailableJobRoles(newArray);
        newData.preferredJobRoles = newData.preferredJobRoles.filter((role) =>
          availableRoles.includes(role)
        );
      }

      // Inline validation with the NEW data
      if (touched[field]) {
        setErrors((prevErr) => ({ ...prevErr, [field]: validateField(field, newArray) }));
      }

      return newData;
    });
  };

  const updateError = (field, value) => {
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validateField(field, value) }));
    }
  };

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    updateError(field, value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateStep(3)) return;

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${config.apiBaseUrl}/api/auth/onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save data');

      toast.success('Welcome aboard! 🚀');
      onComplete();
    } catch (error) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const careerSectors = [
    'IT & Technology',
    'Healthcare',
    'Education',
    'Design & Creative',
    'Finance & Banking',
    'Government',
    'Startups',
    'Manufacturing',
    'Retail & E-commerce',
    'Consulting',
    'Media & Entertainment',
    'Non-profit',
  ];

  const jobRolesBySector = {
    'IT & Technology': [
      'Software Developer',
      'Data Scientist',
      'DevOps Engineer',
      'Cybersecurity Analyst',
      'Product Manager',
      'Technical Writer',
      'System Administrator',
      'Cloud Architect',
      'AI/ML Engineer',
      'Full Stack Developer',
      'Mobile App Developer',
      'Database Administrator',
    ],
    Healthcare: [
      'Doctor',
      'Nurse',
      'Pharmacist',
      'Medical Researcher',
      'Healthcare Administrator',
      'Physical Therapist',
      'Mental Health Counselor',
      'Biomedical Engineer',
      'Public Health Specialist',
      'Medical Technologist',
      'Healthcare Data Analyst',
    ],
    Education: [
      'Teacher',
      'Professor',
      'Educational Administrator',
      'Curriculum Developer',
      'Educational Technology Specialist',
      'Student Counselor',
      'Training Manager',
      'Educational Researcher',
      'Academic Advisor',
      'Learning Designer',
    ],
    'Design & Creative': [
      'UX Designer',
      'UI Designer',
      'Graphic Designer',
      'Product Designer',
      'Creative Director',
      'Art Director',
      'Web Designer',
      'Motion Graphics Designer',
      'Brand Designer',
      'Illustrator',
      'Photographer',
      'Video Editor',
    ],
    'Finance & Banking': [
      'Financial Analyst',
      'Investment Banker',
      'Risk Manager',
      'Accountant',
      'Financial Advisor',
      'Credit Analyst',
      'Treasury Manager',
      'Compliance Officer',
      'Portfolio Manager',
      'Insurance Agent',
      'Tax Specialist',
      'Auditor',
    ],
    Government: [
      'Policy Analyst',
      'Public Administrator',
      'Government Relations Specialist',
      'Civil Service Officer',
      'Public Health Official',
      'Urban Planner',
      'Diplomat',
      'Legislative Assistant',
      'Government Accountant',
      'Public Safety Officer',
    ],
    Startups: [
      'Founder/CEO',
      'Co-founder',
      'Product Manager',
      'Growth Hacker',
      'Business Development Manager',
      'Operations Manager',
      'Marketing Manager',
      'Sales Manager',
      'Technical Co-founder',
      'Startup Consultant',
    ],
    Manufacturing: [
      'Production Manager',
      'Quality Assurance Manager',
      'Industrial Engineer',
      'Supply Chain Manager',
      'Manufacturing Engineer',
      'Operations Director',
      'Plant Manager',
      'Process Engineer',
      'Safety Manager',
      'Maintenance Manager',
    ],
    'Retail & E-commerce': [
      'E-commerce Manager',
      'Retail Manager',
      'Merchandise Planner',
      'Supply Chain Analyst',
      'Digital Marketing Manager',
      'Customer Experience Manager',
      'Inventory Manager',
      'Store Operations Manager',
      'E-commerce Specialist',
      'Retail Buyer',
    ],
    Consulting: [
      'Management Consultant',
      'Strategy Consultant',
      'IT Consultant',
      'Financial Consultant',
      'HR Consultant',
      'Operations Consultant',
      'Change Management Consultant',
      'Business Analyst',
      'Senior Consultant',
    ],
    'Media & Entertainment': [
      'Content Creator',
      'Social Media Manager',
      'Digital Marketing Specialist',
      'Video Producer',
      'Content Strategist',
      'Public Relations Manager',
      'Event Manager',
      'Journalist',
      'Broadcast Producer',
      'Entertainment Manager',
    ],
    'Non-profit': [
      'Program Manager',
      'Grant Writer',
      'Fundraising Manager',
      'Volunteer Coordinator',
      'Community Outreach Manager',
      'Non-profit Administrator',
      'Advocacy Manager',
      'Development Director',
      'Social Worker',
      'Non-profit Consultant',
    ],
  };

  const SKILL_TREE_CATEGORIES = [
    'Communication',
    'Coding',
    'Marketing',
    'Design',
    'Technical',
    'Management',
    'Wellness',
    'Analysis',
    'Creativity',
    'Teamwork',
  ];

  const getAvailableJobRoles = (selectedSectors) => {
    if (selectedSectors.length === 0) return [];
    const allRoles = [];
    selectedSectors.forEach((sector) => {
      if (jobRolesBySector[sector]) allRoles.push(...jobRolesBySector[sector]);
    });
    return [...new Set(allRoles)];
  };

  // UI Components
  const SelectableCard = ({ label, selected, onClick, icon: Icon }) => (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        cursor-pointer rounded-xl p-4 border transition-all duration-200 flex items-center gap-3
        ${
          selected
            ? 'bg-blue-50 border-blue-500 shadow-md ring-1 ring-blue-500'
            : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-sm'
        }
      `}
    >
      {selected ? (
        <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-3.5 h-3.5 text-white" />
        </div>
      ) : (
        <div
          className={`w-5 h-5 rounded-full border-2 border-slate-300 shrink-0 ${Icon ? 'hidden' : ''}`}
        />
      )}
      {Icon && <Icon className={`w-5 h-5 ${selected ? 'text-blue-600' : 'text-slate-400'}`} />}
      <span className={`text-sm font-medium ${selected ? 'text-blue-900' : 'text-slate-600'}`}>
        {label}
      </span>
    </motion.div>
  );

  const SectionHeader = ({ icon: Icon, title, description }) => (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2.5 bg-blue-100 rounded-lg text-blue-600">
          <Icon className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800">{title}</h2>
      </div>
      <p className="text-slate-500 ml-12">{description}</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/20 blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/20 blur-[100px] animate-pulse delay-1000" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-4xl relative z-10"
      >
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 overflow-hidden">
          {/* Progress Header */}
          <div className="bg-slate-50/50 border-b border-slate-200 p-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h1 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-500" />
                  Personalize Your Journey
                </h1>
                <p className="text-xs text-slate-500 mt-1">Step {currentStep} of 3</p>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((step) => (
                  <div
                    key={step}
                    className={`w-3 h-3 rounded-full transition-colors duration-300 ${
                      step === currentStep
                        ? 'bg-blue-600 scale-125'
                        : step < currentStep
                          ? 'bg-green-500'
                          : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-600"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / 3) * 100}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div className="p-6 md:p-8 min-h-[500px]">
            <AnimatePresence mode="wait">
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SectionHeader
                    icon={Briefcase}
                    title="Career Vision"
                    description="Let's find the path that fits you best."
                  />

                  <div className="space-y-8">
                    {/* Career Sectors */}
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3 ml-1">
                        Preferred Sectors <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {careerSectors.map((sector) => (
                          <SelectableCard
                            key={sector}
                            label={sector}
                            selected={formData.preferredCareerSectors.includes(sector)}
                            onClick={() => handleMultiSelect('preferredCareerSectors', sector)}
                          />
                        ))}
                      </div>
                      {errors.preferredCareerSectors && (
                        <p className="text-red-500 text-xs mt-2 ml-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> {errors.preferredCareerSectors}
                        </p>
                      )}
                    </div>

                    {/* Job Roles */}
                    <AnimatePresence>
                      {formData.preferredCareerSectors.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <label className="block text-sm font-semibold text-slate-700 mb-3 ml-1">
                            Interested Roles <span className="text-red-500">*</span>
                          </label>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {getAvailableJobRoles(formData.preferredCareerSectors).map((role) => (
                              <SelectableCard
                                key={role}
                                label={role}
                                selected={formData.preferredJobRoles.includes(role)}
                                onClick={() => handleMultiSelect('preferredJobRoles', role)}
                              />
                            ))}
                          </div>
                          {errors.preferredJobRoles && (
                            <p className="text-red-500 text-xs mt-2 ml-1">
                              {errors.preferredJobRoles}
                            </p>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Future Plan & Goals */}
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Future Plan <span className="text-red-500">*</span>
                        </label>
                        <select
                          value={formData.futurePlan}
                          onChange={(e) => handleChange('futurePlan', e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
                        >
                          <option value="">Select your path...</option>
                          {[
                            'Higher Studies',
                            'Job/Employment',
                            'Entrepreneurship',
                            'Research',
                            'Civil Services',
                            'Freelancing',
                            'Others',
                          ].map((o) => (
                            <option key={o} value={o}>
                              {o}
                            </option>
                          ))}
                        </select>
                        {errors.futurePlan && (
                          <p className="text-red-500 text-xs mt-1">{errors.futurePlan}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Company Type <span className="text-red-500">*</span>
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {['Startups', 'MNCs', 'Government', 'NGOs'].map((type) => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => handleMultiSelect('preferredCompanyType', type)}
                              className={`px-3 py-1.5 text-sm rounded-full border transition-all ${
                                formData.preferredCompanyType.includes(type)
                                  ? 'bg-blue-100 border-blue-500 text-blue-700'
                                  : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                              }`}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                        {errors.preferredCompanyType && (
                          <p className="text-red-500 text-xs mt-1">{errors.preferredCompanyType}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Career Goal <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={formData.careerGoals}
                        onChange={(e) => handleChange('careerGoals', e.target.value)}
                        placeholder="Briefly describe what you want to achieve..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none h-24"
                      />
                      {errors.careerGoals && (
                        <p className="text-red-500 text-xs mt-1">{errors.careerGoals}</p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SectionHeader
                    icon={Globe}
                    title="Interests & Logistics"
                    description="Tailor the events and opportunities you see."
                  />

                  <div className="space-y-8">
                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3 ml-1">
                        Event Types <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {[
                          'Workshops',
                          'Seminars',
                          'Hackathons',
                          'Internships',
                          'Competitions',
                          'Mentorship',
                        ].map((type) => (
                          <SelectableCard
                            key={type}
                            label={type}
                            icon={Calendar}
                            selected={formData.eventTypesInterested.includes(type)}
                            onClick={() => handleMultiSelect('eventTypesInterested', type)}
                          />
                        ))}
                      </div>
                      {errors.eventTypesInterested && (
                        <p className="text-red-500 text-xs mt-1">{errors.eventTypesInterested}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3 ml-1">
                        Availability <span className="text-red-500">*</span>
                      </label>
                      <div className="flex flex-wrap gap-3">
                        {['Weekdays', 'Weekends', 'Evenings', 'Mornings', 'Flexible'].map((opt) => (
                          <SelectableCard
                            key={opt}
                            label={opt}
                            icon={Clock}
                            selected={formData.availabilityPreferences.includes(opt)}
                            onClick={() => handleMultiSelect('availabilityPreferences', opt)}
                          />
                        ))}
                      </div>
                      {errors.availabilityPreferences && (
                        <p className="text-red-500 text-xs mt-1">
                          {errors.availabilityPreferences}
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Willingness to Travel <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {['Local Only', 'Within City', 'Within State', 'Anywhere'].map((opt) => (
                          <SelectableCard
                            key={opt}
                            label={opt}
                            icon={MapPin}
                            selected={formData.willingnessToTravel === opt}
                            onClick={() => handleChange('willingnessToTravel', opt)}
                          />
                        ))}
                      </div>
                      {errors.willingnessToTravel && (
                        <p className="text-red-500 text-xs mt-1">{errors.willingnessToTravel}</p>
                      )}
                    </div>

                    {/* Hobbies - Interactive Tag Input */}
                    <div data-field="hobbies">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Hobbies & Interests
                      </label>
                      <div className="space-y-3">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={rawHobbiesText}
                            onChange={(e) => setRawHobbiesText(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                if (rawHobbiesText.trim()) {
                                  handleMultiSelect('hobbies', rawHobbiesText.trim());
                                  setRawHobbiesText('');
                                }
                              }
                            }}
                            placeholder="Type a hobby and press Enter..."
                            className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (rawHobbiesText.trim()) {
                                handleMultiSelect('hobbies', rawHobbiesText.trim());
                                setRawHobbiesText('');
                              }
                            }}
                            className="px-4 py-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors font-medium"
                          >
                            Add
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2 min-h-[40px]">
                          <AnimatePresence>
                            {formData.hobbies.map((hobby) => (
                              <motion.span
                                key={hobby}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-full text-sm shadow-sm"
                              >
                                {hobby}
                                <button
                                  type="button"
                                  onClick={() => handleMultiSelect('hobbies', hobby)}
                                  className="p-0.5 hover:bg-blue-100 rounded-full transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </motion.span>
                            ))}
                          </AnimatePresence>
                          {formData.hobbies.length === 0 && (
                            <span className="text-slate-400 text-sm italic py-2">
                              No hobbies added yet.
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <SectionHeader
                    icon={GraduationCap}
                    title="Learning Profile"
                    description="How do you learn best?"
                  />

                  <div className="space-y-8">
                    {/* Skills to Develop - Tag Input */}
                    <div data-field="skillsToDevelop">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Skills you want to develop <span className="text-red-500">*</span>
                      </label>
                      <div className="space-y-4">
                        {/* Official Skill Tree Categories */}
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                          {SKILL_TREE_CATEGORIES.map((skill) => (
                            <SelectableCard
                              key={skill}
                              label={skill}
                              selected={formData.skillsToDevelop.includes(skill)}
                              onClick={() => handleMultiSelect('skillsToDevelop', skill)}
                            />
                          ))}
                        </div>

                        {/* Custom Skills Input */}
                        <div className="space-y-2">
                          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                            Other Skills / Specifics
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={rawSkillsText}
                              onChange={(e) => setRawSkillsText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  if (rawSkillsText.trim()) {
                                    handleMultiSelect('skillsToDevelop', rawSkillsText.trim());
                                    setRawSkillsText('');
                                  }
                                }
                              }}
                              placeholder="E.g. Python, Public Speaking, Leadership..."
                              className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (rawSkillsText.trim()) {
                                  handleMultiSelect('skillsToDevelop', rawSkillsText.trim());
                                  setRawSkillsText('');
                                }
                              }}
                              className="px-4 py-3 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 transition-colors font-medium"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        {/* Selected Skills Display */}
                        <div className="flex flex-wrap gap-2 min-h-[40px]">
                          <AnimatePresence>
                            {formData.skillsToDevelop.map((skill) => (
                              <motion.span
                                key={skill}
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-full text-sm shadow-sm transition-colors ${
                                  SKILL_TREE_CATEGORIES.includes(skill)
                                    ? 'bg-blue-50 border-blue-200 text-blue-700 font-medium'
                                    : 'bg-slate-50 border-slate-200 text-slate-700'
                                }`}
                              >
                                {SKILL_TREE_CATEGORIES.includes(skill) && (
                                  <Sparkles className="w-3 h-3 text-amber-500" />
                                )}
                                {skill}
                                <button
                                  type="button"
                                  onClick={() => handleMultiSelect('skillsToDevelop', skill)}
                                  className="p-0.5 hover:bg-black/5 rounded-full transition-colors"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </motion.span>
                            ))}
                          </AnimatePresence>
                          {formData.skillsToDevelop.length === 0 && (
                            <span className="text-slate-400 text-sm italic py-2">
                              Select a skill above or add your own.
                            </span>
                          )}
                        </div>

                        {errors.skillsToDevelop && (
                          <p className="text-red-500 text-xs mt-1">{errors.skillsToDevelop}</p>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-3 ml-1">
                        Learning Style <span className="text-red-500">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {['Visual', 'Hands-on', 'Group Learning', 'Reading', 'Audio', 'Mixed'].map(
                          (style) => (
                            <SelectableCard
                              key={style}
                              label={style}
                              selected={formData.preferredLearningStyle === style}
                              onClick={() => handleChange('preferredLearningStyle', style)}
                            />
                          )
                        )}
                      </div>
                      {errors.preferredLearningStyle && (
                        <p className="text-red-500 text-xs mt-1">{errors.preferredLearningStyle}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-slate-700 mb-2">
                        Peer Groups
                      </label>
                      <input
                        type="text"
                        value={formData.peerGroups.join(', ')}
                        onChange={(e) => {
                          const val = e.target.value;
                          setFormData((prev) => ({
                            ...prev,
                            peerGroups: val
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          }));
                        }}
                        placeholder="Coding Club, Debate Team..."
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer Actions */}
          <div className="p-6 border-t border-slate-200 bg-slate-50/50 flex justify-between items-center">
            <button
              onClick={handlePrev}
              disabled={currentStep === 1}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium transition-all ${
                currentStep === 1
                  ? 'text-slate-300 cursor-not-allowed'
                  : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <ArrowLeft className="w-4 h-4" /> Back
            </button>

            {currentStep < 3 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95"
              >
                Next Step <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="flex items-center gap-2 px-8 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold shadow-lg shadow-green-200 transition-all hover:scale-105 active:scale-95 disabled:opacity-70 disabled:scale-100"
              >
                {isLoading ? (
                  <>
                    Saving...{' '}
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </>
                ) : (
                  <>
                    Complete Setup <Sparkles className="w-4 h-4" />
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default StudentOnboarding;
