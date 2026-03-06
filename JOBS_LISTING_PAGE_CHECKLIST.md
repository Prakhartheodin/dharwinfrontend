# Jobs Listing Page - Feature Checklist

This checklist covers all features and functionality of the Jobs Listing Page. Use this for:
1. **Development Reference**: When creating similar listing pages for other sections
2. **Quality Assurance**: Testing all features to ensure they work properly
3. **User Acceptance Testing**: Verifying all user-facing functionality

---

## 📋 **1. PAGE STRUCTURE & LAYOUT**

### 1.1 Overall Layout
- [ ] Page uses consistent template structure with `Pageheader` and `Seo` components
- [ ] Main container uses grid layout (`grid grid-cols-12 gap-6`)
- [ ] Content area height matches viewport (`h-[calc(100vh-8rem)]`)
- [ ] Box container uses flex layout (`flex flex-col`)
- [ ] Dark mode support is consistent throughout

### 1.2 Box Structure
- [ ] Box header is present and properly styled
- [ ] Box body takes remaining space (`flex-1`)
- [ ] Box footer shows pagination information
- [ ] No extra white space at bottom of page
- [ ] Box header remains visible (not sticky, to avoid viewport locking)

---

## 📊 **2. TABLE HEADER SECTION**

### 2.1 Header Title
- [ ] Page title displays correctly (e.g., "Jobs")
- [ ] Badge shows filtered/total count next to title
- [ ] Badge updates dynamically when filters are applied

### 2.2 Header Action Buttons (Left to Right Order)
- [ ] **Show Dropdown**: Select page size (10, 25, 50, 100)
  - [ ] Dropdown displays current page size
  - [ ] Changing page size updates table rows correctly
  - [ ] Pagination resets to page 1 when page size changes
  
- [ ] **Sort Button**: Dropdown with sort icon
  - [ ] Button displays "Sort" with sort icon
  - [ ] Dropdown opens on click
  - [ ] All sort options are visible in dropdown
  - [ ] Selected sort option is highlighted
  - [ ] Sort applies correctly to table data

- [ ] **Create Button**: Primary button
  - [ ] Button displays "Create Job" with add icon
  - [ ] Button triggers create modal (or navigates to create page)
  
- [ ] **Excel Dropdown**: 
  - [ ] Button displays "Excel" with Excel icon
  - [ ] Dropdown contains 3 options: Import, Export, Template
  - [ ] All options are clickable (functionality can be placeholder)
  
- [ ] **Search Button**: 
  - [ ] Button displays "Search" with search icon
  - [ ] Badge shows active filter count when filters are applied
  - [ ] Opens filter/search sidebar panel from right
  - [ ] Badge disappears when no filters are active

- [ ] **Delete Button**: 
  - [ ] Button displays "Delete" with delete icon
  - [ ] Only enabled when rows are selected
  - [ ] Shows confirmation before deleting (if implemented)

---

## 📋 **3. DATA TABLE FEATURES**

### 3.1 Table Structure
- [ ] Table has striped rows (`table-striped`)
- [ ] Rows have hover effect (`table-hover`)
- [ ] Table has borders (`table-bordered`)
- [ ] Border color is visible (not too light)
- [ ] Horizontal borders are present between rows
- [ ] Vertical borders are present between columns

### 3.2 Table Header
- [ ] Header background is subtly highlighted (not too bright)
- [ ] Header is sticky on scroll (`sticky top-0 z-10`)
- [ ] Header background is solid (not transparent) to prevent text overlap
- [ ] Header checkbox for "select all" is present
- [ ] Column headers are sortable (where applicable)
- [ ] Sort indicators (arrows) appear on sorted columns
- [ ] Column headers display correctly with proper styling

### 3.3 Table Columns
- [ ] **Checkbox Column (First Column)**:
  - [ ] Checkbox in header for "select all"
  - [ ] Checkbox in each row for individual selection
  - [ ] Header checkbox selects ALL items in filtered dataset
  - [ ] Individual checkboxes toggle row selection
  - [ ] Checkbox state reflects selection correctly
  - [ ] Indeterminate state shows when some (not all) are selected

- [ ] **Job Title Column**:
  - [ ] Text is clickable (cursor changes to pointer on hover)
  - [ ] Text color changes on hover (hover:text-primary)
  - [ ] Clicking opens job preview sidebar from right
  - [ ] Title displays correctly

- [ ] **Company Column**:
  - [ ] Text is clickable (cursor changes to pointer on hover)
  - [ ] Text color changes on hover (hover:text-primary)
  - [ ] Clicking opens company info sidebar from right
  - [ ] Company name displays correctly

- [ ] **Location Column**:
  - [ ] Displays location text
  - [ ] Column is sortable

- [ ] **Experience Column**:
  - [ ] Displays experience text
  - [ ] Column is sortable

- [ ] **Salary Column**:
  - [ ] Displays salary text
  - [ ] Colored icon displays next to salary (based on salary tier)
  - [ ] Icon color matches salary tier (high=green, medium=blue, low=gray)
  - [ ] Icon and text are in one row

- [ ] **Posted By Column**:
  - [ ] Displays posted by information
  - [ ] Column is sortable

- [ ] **Actions Column (Last Column)**:
  - [ ] Contains action buttons: Edit, Bookmark, Share
  - [ ] Buttons are icon-only
  - [ ] Tooltips work on hover for each button
  - [ ] Buttons are properly spaced

---

## 🎯 **4. ACTION BUTTONS IN TABLE**

### 4.1 Edit Button
- [ ] Icon: Pencil (`ri-pencil-line`)
- [ ] Tooltip displays "Edit Job" on hover
- [ ] Button is clickable (opens edit modal/page)
- [ ] Button styling is consistent (info color)

### 4.2 Bookmark Button
- [ ] Icon: Bookmark (filled when bookmarked, outline when not)
- [ ] Button color changes when bookmarked (warning color when bookmarked)
- [ ] Tooltip displays "View Notes" when bookmarked, "Bookmark Job" when not
- [ ] Clicking opens bookmark notes sidebar from right
- [ ] Job is automatically bookmarked if not already bookmarked

### 4.3 Share Button
- [ ] Icon: Share (`ri-share-line`)
- [ ] Tooltip displays "Share Job" on hover
- [ ] Button is clickable
- [ ] Opens share modal popup
- [ ] Button styling is consistent (success color)

### 4.4 Delete Button (Removed)
- [ ] Delete button is NOT present in action column (as per requirements)

---

## 🔍 **5. FILTER/SEARCH SIDEBAR**

### 5.1 Sidebar Panel
- [ ] Opens from right side when "Search" button is clicked
- [ ] Uses offcanvas component (`ti-offcanvas ti-offcanvas-right`)
- [ ] Sidebar width is consistent (default width, not custom max-width)
- [ ] Has backdrop/overlay when open
- [ ] Closes when close button is clicked
- [ ] Closes when backdrop is clicked (if implemented)

### 5.2 Sidebar Header
- [ ] Displays "Search Jobs" title with search icon
- [ ] Close button is present and functional
- [ ] Reset button is present in header

### 5.3 Filter Options

#### 5.3.1 Job Title Filter
- [ ] Label displays "Job Title" with count in parentheses (e.g., "Job Title (12)")
- [ ] Dropdown with search functionality
- [ ] Search input filters options as you type
- [ ] Multiple selection is supported
- [ ] Selected items appear as pills/badges below dropdown
- [ ] Each pill has remove/cross button
- [ ] Removing pill removes that filter

#### 5.3.2 Company Filter
- [ ] Label displays "Company" with count in parentheses
- [ ] Dropdown with search functionality
- [ ] Multiple selection is supported
- [ ] Selected items appear as pills/badges
- [ ] Pills can be removed individually

#### 5.3.3 Experience Filter
- [ ] Label displays "Experience"
- [ ] Range slider component
- [ ] Slider shows min and max values
- [ ] Values update as slider moves
- [ ] Tooltip shows value when dragging

#### 5.3.4 Location Filter
- [ ] Label displays "Location" with count in parentheses
- [ ] Dropdown with search functionality
- [ ] Multiple selection is supported
- [ ] Selected items appear as pills/badges
- [ ] Pills can be removed individually

#### 5.3.5 Salary Filter
- [ ] Label displays "Salary"
- [ ] Range slider component
- [ ] Slider shows min and max values
- [ ] Values display with currency formatting
- [ ] Tooltip shows value when dragging

#### 5.3.6 Active Status Filter
- [ ] Label displays "Active Status"
- [ ] Radio button options: All, Active, Inactive
- [ ] Selection works correctly

#### 5.3.7 Posting Date Filter
- [ ] Label displays "Posting Date"
- [ ] Date input field
- [ ] Date selection works correctly

### 5.4 Filter Actions
- [ ] **Reset Button**: Clears all filters and resets to default
- [ ] **Close Button**: Closes the sidebar
- [ ] **Apply Filters**: Filters table data when filters are changed
- [ ] Filter count badge updates in Search button

---

## 🔄 **6. SORTING FUNCTIONALITY**

### 6.1 Sort Dropdown Options
- [ ] Job Title (A-Z) - sorts ascending
- [ ] Job Title (Z-A) - sorts descending
- [ ] Company (A-Z) - sorts ascending
- [ ] Company (Z-A) - sorts descending
- [ ] Location (A-Z) - sorts ascending
- [ ] Location (Z-A) - sorts descending
- [ ] Date (Newest) - sorts by date descending
- [ ] Date (Oldest) - sorts by date ascending
- [ ] Experience (Low-High) - sorts ascending
- [ ] Experience (High-Low) - sorts descending
- [ ] Newest First - sorts by posting date descending
- [ ] Oldest First - sorts by posting date ascending
- [ ] Clear Sort - removes sorting

### 6.2 Sort Behavior
- [ ] Selected sort option is highlighted with 'active' class
- [ ] Table data updates immediately when sort is selected
- [ ] Column header shows sort indicator when sorted via dropdown
- [ ] Clear Sort resets table to default/unsorted state
- [ ] Sort persists when changing pages (if applicable)

---

## 📄 **7. PAGINATION**

### 7.1 Pagination Controls
- [ ] "Prev" button is present
- [ ] "Prev" button is disabled on first page
- [ ] "Next" button is present
- [ ] "Next" button is disabled on last page
- [ ] Page numbers display correctly
- [ ] Current page is highlighted
- [ ] Clicking page number navigates to that page

### 7.2 Smart Pagination
- [ ] Shows all pages if 7 or fewer pages
- [ ] Shows ellipsis (...) when more than 7 pages
- [ ] First page (1) always visible when not in first 3 pages
- [ ] Last page always visible when not in last 3 pages
- [ ] Current page and adjacent pages (2 before, 2 after) are visible

### 7.3 Pagination Info
- [ ] Footer shows "Showing X to Y of Z entries"
- [ ] Numbers update correctly based on current page and page size
- [ ] Calculation is correct (accounting for last page having fewer items)

---

## 📑 **8. SIDEBARS & MODALS**

### 8.1 Job Preview Sidebar
- [ ] Opens from right side when job title is clicked
- [ ] Sidebar width is wider (`!max-w-[50rem] lg:!max-w-[60rem]`)
- [ ] Header shows job title with briefcase icon
- [ ] Close button works
- [ ] Content includes:
  - [ ] Job badges (urgency, job type, remote, salary tier)
  - [ ] Bookmark button (toggles bookmark state)
  - [ ] Key details grid (Company, Location, Experience, Salary)
  - [ ] Company information section (if available)
  - [ ] Job description (formatted HTML)
  - [ ] Posted by and Posted date
  - [ ] Close and Apply Now buttons at bottom
- [ ] Company name in sidebar is clickable and opens company sidebar
- [ ] Sidebar closes properly when navigating to company sidebar

### 8.2 Company Info Sidebar
- [ ] Opens from right side when company name is clicked
- [ ] Sidebar width matches job preview sidebar
- [ ] Header shows company name with building icon
- [ ] Close button works
- [ ] Content includes:
  - [ ] Company header with gradient background
  - [ ] Company details (Industry, Size, Founded, Website)
  - [ ] Company description (if available)
  - [ ] Active job postings list
  - [ ] Each job posting is clickable (opens job preview)
- [ ] Backdrop is present when sidebar is open
- [ ] Sidebar closes properly when navigating to job preview

### 8.3 Bookmark Notes Sidebar
- [ ] Opens from right side when bookmark button is clicked
- [ ] Sidebar width matches search sidebar (default width)
- [ ] Header shows job title with bookmark icon
- [ ] Close button works
- [ ] Content includes:
  - [ ] Job info header (title, company, location, salary)
  - [ ] Add Note form:
    - [ ] Textarea for note input
    - [ ] Radio buttons for visibility (Public/Private)
    - [ ] Add Note button (disabled when textarea is empty)
  - [ ] Notes list showing:
    - [ ] Visibility badge (Public/Private with icons)
    - [ ] Posted date and time
    - [ ] Note content
    - [ ] Posted by information
    - [ ] Delete button for each note
- [ ] Adding note clears form and adds to list
- [ ] Notes are sorted by date (newest first)
- [ ] Delete button removes note from list
- [ ] Empty state shows when no notes exist

### 8.4 Share Modal
- [ ] Opens as modal (not sidebar) when share button is clicked
- [ ] Modal is centered on screen
- [ ] Header shows "Share Job" with share icon
- [ ] Close button works
- [ ] Content includes:
  - [ ] Job info summary (title, company, location)
  - [ ] Public URL input field (read-only)
  - [ ] Copy button (changes to "Copied!" when clicked)
  - [ ] WhatsApp share button
  - [ ] Email share section:
    - [ ] Email button (shows input field when clicked)
    - [ ] Email input field appears when email button clicked
    - [ ] Send button (disabled when email is empty)
    - [ ] Cancel button (hides input field)
- [ ] Copy URL copies to clipboard
- [ ] WhatsApp opens in new tab with pre-filled message
- [ ] Email input validates email format (if implemented)
- [ ] Modal resets properly when closed

---

## 📊 **9. EXCEL OPERATIONS**

### 9.1 Excel Dropdown
- [ ] Button displays "Excel" with Excel icon
- [ ] Dropdown contains 3 options:
  - [ ] Import (with upload icon)
  - [ ] Export (with Excel icon)
  - [ ] Template (with download icon)
- [ ] All options are clickable (functionality can be placeholder for now)

---

## 🎨 **10. UI/UX FEATURES**

### 10.1 Visual Design
- [ ] All icons are from Remix Icon library
- [ ] Colors follow template theme
- [ ] Dark mode styling is consistent
- [ ] Spacing and padding are consistent
- [ ] Font sizes are appropriate
- [ ] Hover effects work on interactive elements

### 10.2 Responsive Design
- [ ] Layout adapts to different screen sizes
- [ ] Sidebars work on mobile devices
- [ ] Table is scrollable horizontally if needed
- [ ] Buttons wrap properly on smaller screens

### 10.3 Accessibility
- [ ] Tooltips provide helpful information
- [ ] Buttons have appropriate ARIA labels
- [ ] Keyboard navigation works (where applicable)
- [ ] Screen reader friendly (where applicable)

---

## 🔧 **11. STATE MANAGEMENT**

### 11.1 Selection State
- [ ] Row selection state persists correctly
- [ ] Select all works for filtered dataset
- [ ] Individual selection toggles correctly
- [ ] Selection state updates when filters change

### 11.2 Bookmark State
- [ ] Bookmark state persists for each job
- [ ] Bookmark icon updates when toggled
- [ ] Bookmarked jobs can be identified visually

### 11.3 Filter State
- [ ] Filters persist when sidebar is closed and reopened
- [ ] Filters reset when Reset button is clicked
- [ ] Active filter count updates correctly

### 11.4 Sort State
- [ ] Selected sort option is tracked
- [ ] Sort state updates when dropdown option is selected
- [ ] Sort clears when "Clear Sort" is selected

---

## ⚡ **12. PERFORMANCE & FUNCTIONALITY**

### 12.1 Data Handling
- [ ] Table data filters correctly based on filter criteria
- [ ] Sorting works on filtered data
- [ ] Pagination works with filtered/sorted data
- [ ] Count badges update correctly with filtered data

### 12.2 Interactions
- [ ] No console errors
- [ ] No JavaScript errors when interacting with elements
- [ ] Sidebars open and close smoothly
- [ ] Modals open and close smoothly
- [ ] Tooltips display and hide correctly

### 12.3 Edge Cases
- [ ] Empty state handled (no data)
- [ ] Single page pagination works correctly
- [ ] Filtering to zero results handled gracefully
- [ ] Maximum page navigation works

---

## 📝 **13. CODE QUALITY CHECKLIST**

### 13.1 Structure
- [ ] Uses React hooks properly (`useState`, `useMemo`, `useEffect`)
- [ ] Uses react-table hooks (`useTable`, `useSortBy`, `usePagination`)
- [ ] TypeScript types are defined where needed
- [ ] Code is organized and readable

### 13.2 Best Practices
- [ ] No hardcoded values (use constants where appropriate)
- [ ] Functions are properly scoped
- [ ] Event handlers are properly bound
- [ ] No memory leaks (cleanup in useEffect if needed)

---

## ✅ **14. TESTING SCENARIOS**

### Scenario 1: Basic Navigation
1. [ ] Page loads without errors
2. [ ] Table displays data correctly
3. [ ] All columns are visible
4. [ ] Pagination works

### Scenario 2: Filtering
1. [ ] Open search sidebar
2. [ ] Apply job title filter - verify results
3. [ ] Apply company filter - verify results combine
4. [ ] Apply salary range - verify results
5. [ ] Reset filters - verify all cleared
6. [ ] Filter count badge updates correctly

### Scenario 3: Sorting
1. [ ] Select "Job Title (A-Z)" - verify sorting
2. [ ] Select "Date (Newest)" - verify sorting
3. [ ] Clear sort - verify default order
4. [ ] Sort combined with filters - verify both work together

### Scenario 4: Row Selection
1. [ ] Click individual checkbox - row selects
2. [ ] Click header checkbox - all rows select
3. [ ] Uncheck header checkbox - all rows deselect
4. [ ] Select all, then filter - verify only filtered rows remain selected
5. [ ] Select filtered rows, clear filter - verify selection persists

### Scenario 5: Job Preview
1. [ ] Click job title - sidebar opens
2. [ ] Verify all content displays
3. [ ] Click company name in sidebar - company sidebar opens
4. [ ] Click job in company sidebar - job preview opens
5. [ ] Close sidebar - verifies closes properly

### Scenario 6: Bookmark & Notes
1. [ ] Click bookmark button - sidebar opens
2. [ ] Add a note - verify note appears
3. [ ] Add note with Public visibility - verify badge
4. [ ] Add note with Private visibility - verify badge
5. [ ] Delete a note - verify removed
6. [ ] Close and reopen sidebar - verify notes persist

### Scenario 7: Share Functionality
1. [ ] Click share button - modal opens
2. [ ] Copy URL - verify copied to clipboard
3. [ ] Click WhatsApp - verify opens in new tab
4. [ ] Click Email - verify input appears
5. [ ] Enter email and send - verify functionality (if implemented)
6. [ ] Cancel email input - verify input hides

### Scenario 8: Pagination
1. [ ] Navigate through pages
2. [ ] Change page size - verify rows update
3. [ ] Verify pagination info updates correctly
4. [ ] Test edge cases (first page, last page)

---

## 🎯 **15. COMPARISON CHECKLIST FOR NEW LISTING PAGES**

When creating a new listing page, ensure:

- [ ] Page structure matches Jobs page layout
- [ ] Table has same styling (striped, hover, bordered)
- [ ] Header has same button layout and order
- [ ] Filter sidebar has similar structure (adjust filters as needed)
- [ ] Sort dropdown has appropriate options for that entity
- [ ] Pagination works identically
- [ ] Sidebars/modals follow same patterns
- [ ] Action buttons are consistent
- [ ] Tooltips are present for all action buttons
- [ ] Dark mode styling is consistent
- [ ] Responsive behavior matches

---

## 📌 **NOTES FOR DEVELOPERS**

1. **Data Structure**: Ensure data structure supports all required fields (id, display fields, metadata)
2. **Filter Logic**: Update filter logic based on entity-specific fields
3. **Sort Options**: Customize sort options based on entity fields
4. **Sidebar Content**: Customize sidebar content based on entity details
5. **Actions**: Adjust actions based on entity requirements (some entities may not need bookmark/share)
6. **Validation**: Add form validation where needed (email input, date inputs, etc.)
7. **API Integration**: Replace mock data with API calls when backend is ready
8. **Error Handling**: Add error handling for API calls and edge cases
9. **Loading States**: Add loading indicators for async operations
10. **Success Messages**: Add success/error messages for user actions

---

## 📌 **NOTES FOR QA TESTERS**

1. **Test on multiple browsers** (Chrome, Firefox, Safari, Edge)
2. **Test on multiple screen sizes** (Desktop, Tablet, Mobile)
3. **Test dark mode** and light mode
4. **Test all interactions** mentioned in checklist
5. **Verify no console errors** in browser dev tools
6. **Check performance** with large datasets (100+ items)
7. **Test edge cases** (empty data, single item, maximum items)
8. **Verify accessibility** (keyboard navigation, screen readers if applicable)
9. **Cross-browser compatibility** - verify styling consistency
10. **Mobile responsiveness** - verify all features work on mobile

---

**Last Updated**: [Current Date]
**Page**: Jobs Listing Page (`/ats/jobs`)
**Template Version**: [Version if applicable]
