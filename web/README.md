# CSIR Reference Management Portal - Frontend

## Overview

React + TypeScript frontend for the CSIR Reference Management Portal. Provides a modern, responsive UI for reference management, form workflows, and system administration.

## Tech Stack

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **HTTP Client**: Axios
- **Icons**: Lucide React
- **Notifications**: React Hot Toast
- **PDF Generation**: jsPDF
- **Date Handling**: date-fns

## Directory Structure

```
frontend/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── ui/             # UI components (modals, forms, tables)
│   │   ├── header/         # Header and navigation
│   │   ├── dashboard/      # Dashboard components
│   │   └── oauth/          # OAuth components
│   ├── pages/              # Page components
│   ├── services/           # API service layer
│   ├── hooks/              # Custom React hooks
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Utility functions
│   ├── constants.ts        # Application constants
│   ├── App.tsx             # Root component
│   └── main.tsx            # Application entry point
├── public/                 # Static assets
└── index.html             # HTML template
```

## Key Features

### 1. Reference Management
- Global, Local, and VIP reference tracking
- Advanced filtering and search
- Movement history visualization
- Bulk operations
- Export to PDF/Excel

### 2. Form Workflows
- AI-powered form generation
- Dynamic form rendering
- Multi-level delegation
- Approval workflows
- File attachments
- Real-time status updates

### 3. User Interface
- Responsive design (mobile-first)
- Dark mode support
- Accessible components
- Loading states and error handling
- Toast notifications

### 4. Administration
- User management
- System configuration
- Audit logs
- Notification center

## Component Architecture

### Pages
- `HomePage.tsx` - Dashboard and statistics
- `GlobalReferencesPage.tsx` - Global reference management
- `LocalReferencesPage.tsx` - Local reference management
- `VIPReferencesPage.tsx` - VIP reference management
- `SharedFormsPage.tsx` - Form workflow management
- `SavedTemplatesPage.tsx` - Form template library
- `SystemSettingsPage.tsx` - System administration
- `UserManagementPage.tsx` - User administration
- `ProfilePage.tsx` - User profile
- `ArchivePage.tsx` - Archived references

### Key Components

#### Form Components
- `DynamicFormRenderer.tsx` - Renders forms from JSON schema
- `FormFillingModal.tsx` - Modal for filling forms
- `DistributeFormModal.tsx` - Form distribution wizard
- `FormCard.tsx` - Form display card

#### UI Components
- `Table.tsx` - Reusable data table
- `InputField.tsx` - Form input with validation
- `Button.tsx` - Styled button component
- `DropDownWithSearch.tsx` - Searchable dropdown
- `MovementHistory.tsx` - Timeline visualization
- `DelegationChainModal.tsx` - Delegation chain viewer

#### Modals
- `AddGlobalReferenceModal.tsx`
- `AddLocalReferenceModal.tsx`
- `UpdateReferenceModal.tsx`
- `BulkUpdateModal.tsx`
- `ShareTemplateModal.tsx`
- And 15+ more specialized modals

## Routing

```typescript
/                           # Home/Dashboard
/global-references          # Global references
/local-references           # Local references
/vip-references             # VIP references
/shared-forms               # Form workflows
/saved-templates            # Form templates
/system-settings            # System configuration
/user-management            # User administration
/profile                    # User profile
/archive                    # Archived references
/login                      # Login page
/forgot-password            # Password reset
```

## State Management

- **Local State**: React useState for component-level state
- **Context**: Used sparingly for global user state
- **API State**: Managed via API service layer with loading/error states

## API Integration

All API calls are centralized in `src/services/`:

```typescript
// Example: form.api.ts
export const getSharedForms = async () => {
  const response = await axiosInstance.get('/api/v1/forms/shared');
  return response.data;
};
```

### API Services
- `user.api.ts` - User authentication and management
- `globalReferences.api.ts` - Global reference operations
- `localReferences.api.ts` - Local reference operations
- `form.api.ts` - Form and workflow operations
- `ai.api.ts` - AI form generation
- `notification.api.ts` - Notifications
- `systemConfig.api.ts` - System configuration
- `audit.api.ts` - Audit logs

## Form Validation

Dynamic validation using `validationRules.ts`:

```typescript
// Supported validation types
- required
- email
- mobile
- pan
- aadhaar
- pincode
- ifsc
- gstin
- numeric
- minLength/maxLength
- min/max (for numbers)
```

## Development

### Setup
```bash
cd frontend
npm install
```

### Run Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Lint
```bash
npm run lint
```

## Environment Variables

Create `.env` file:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_PARICHAY_ENABLED=false
```

## Styling Guidelines

### Tailwind CSS
- Use utility classes for styling
- Follow mobile-first approach
- Use design tokens for consistency

### Color Palette
- Primary: Indigo (`indigo-600`, `indigo-500`)
- Success: Green (`green-500`)
- Warning: Yellow (`yellow-500`)
- Error: Red (`red-500`)
- Neutral: Slate (`slate-100` to `slate-900`)

### Typography
- Headings: `text-xl`, `text-2xl`, `text-3xl`
- Body: `text-sm`, `text-base`
- Small: `text-xs`, `text-[10px]`

## Component Patterns

### Modal Pattern
```typescript
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  // ... other props
}

const MyModal: React.FC<ModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      {/* Modal content */}
    </div>
  );
};
```

### Form Pattern
```typescript
const [formData, setFormData] = useState({});
const [errors, setErrors] = useState({});

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  // Validation and submission logic
};
```

## Error Handling

```typescript
try {
  const data = await apiCall();
  toast.success('Success message');
} catch (error: any) {
  toast.error(error.response?.data?.message || 'An error occurred');
  console.error('Error:', error);
}
```

## Performance Optimization

- **Code Splitting**: Routes are lazy-loaded
- **Memoization**: Use `useMemo` and `useCallback` for expensive operations
- **Virtualization**: Large lists use virtual scrolling
- **Image Optimization**: Images loaded from Cloudinary with optimization

## Accessibility

- Semantic HTML elements
- ARIA labels where needed
- Keyboard navigation support
- Focus management in modals
- Screen reader friendly

## Testing

```bash
npm run test
```

## Build and Deployment

1. Build the project:
   ```bash
   npm run build
   ```

2. Output is in `dist/` folder

3. Deploy to backend:
   ```bash
   cp -r dist/* ../backend/public/
   ```

## Common Tasks

### Adding a New Page
1. Create page component in `src/pages/`
2. Add route in `App.tsx`
3. Add navigation link in `Header.tsx`

### Adding a New API Endpoint
1. Add function to appropriate service file in `src/services/`
2. Use in component with try-catch and toast notifications

### Creating a New Modal
1. Create modal component in `src/components/ui/`
2. Follow existing modal patterns
3. Add open/close state management

## Troubleshooting

### Build Errors
- Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
- Clear Vite cache: `rm -rf node_modules/.vite`

### API Connection Issues
- Check `VITE_API_BASE_URL` in `.env`
- Verify backend is running
- Check CORS configuration

### Type Errors
- Run `npm run type-check` to see all TypeScript errors
- Ensure all types are properly imported

## Contributing

1. Follow existing code structure and patterns
2. Add TypeScript types for all new code
3. Use TSDoc comments for complex functions
4. Test thoroughly before committing
5. Update this README for major changes

## License

CSIR - Council of Scientific and Industrial Research, India

## Contact

For issues or questions, contact: abhishek.chandra@csir.res.in
