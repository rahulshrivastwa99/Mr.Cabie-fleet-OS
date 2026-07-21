#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Complete the Flutter Driver App (/driver_app) and update the FastAPI backend to support four
  founder-requested tasks:
    1. Digital signature + duty-slip completion (already partially implemented — polish flow).
    2. Timestamp feature: store started_at / completed_at ISO timestamps for trips + duty slips.
    3. Location stamp feature: capture GPS lat/lng + reverse-geocoded address at trip start & end,
       persist as start_location / end_location on both trip and duty slip.
    4. Camera capture feature: driver takes a photo at trip start and completion; backend endpoint
       POST /api/driver/trips/{id}/upload-photo stores the file and links its URL to the duty slip
       (start_photo_url / end_photo_url).

backend:
  - task: "Trip start endpoint stores timestamp + location stamp"
    implemented: true
    working: "NA"
    file: "/app/backend/app/routes/driver/trips.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          POST /api/driver/trips/{id}/start now accepts optional latitude, longitude, address in
          TripActionRequest. On success it persists started_at + start_location on both the
          duty (trip) document and the newly-created duty_slip.

  - task: "Trip complete endpoint stores timestamp + location stamp + traveller name"
    implemented: true
    working: "NA"
    file: "/app/backend/app/routes/driver/trips.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          POST /api/driver/trips/{id}/complete now accepts optional latitude, longitude, address
          alongside traveller_name and passenger_signature. It persists completed_at + end_location
          on both the trip and the duty slip.

  - task: "Photo upload endpoint for trip start/end"
    implemented: true
    working: "NA"
    file: "/app/backend/app/routes/driver/trips.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          New endpoint POST /api/driver/trips/{id}/upload-photo (multipart) accepts a `photo`
          file and `photo_type` form field ("start" or "end"). Validates JPEG/PNG/WEBP,
          max 10 MB. Saves to /app/backend/uploads/duty_photos/<uuid> and updates the duty
          slip with start_photo_url or end_photo_url. Uploads served via /api/uploads (StaticFiles).

  - task: "Static files served under /api/uploads"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Mounted /api/uploads via StaticFiles(directory=/app/backend/uploads) so Kubernetes
          ingress /api/* rule routes photo requests to backend. Directory created on startup.

frontend:
  - task: "Driver App - Digital signature + start/complete flow"
    implemented: true
    working: "NA"
    file: "/app/driver_app/lib/screens/active_trip_screen.dart, start_trip_screen.dart, trip_detail_screen.dart"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: |
          Replaced start dialog with dedicated StartTripScreen (opening KM, location stamp, camera
          photo). CompleteTripScreen now collects traveller name, drop-off location stamp, drop
          photo, and signature via signature package. Screens are Android-only; Flutter tests not
          run in this environment.

metadata:
  created_by: "main_agent"
  version: "1.1"
  test_sequence: 1
  run_ui: false

test_plan:
  current_focus:
    - "Trip start endpoint stores timestamp + location stamp"
    - "Trip complete endpoint stores timestamp + location stamp + traveller name"
    - "Photo upload endpoint for trip start/end"
    - "Static files served under /api/uploads"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      Backend now supports the founder-requested Timestamp, Location Stamp, and Camera Capture
      features for the Driver App. Please test:
        1) Driver auth via OTP (existing flow).
        2) POST /api/driver/trips/{id}/start with a JSON body including opening_km, latitude,
           longitude, address — response should be 200 and the duty_slip should show started_at
           and start_location on GET /api/driver/trips/{id}.
        3) POST /api/driver/trips/{id}/upload-photo (multipart) with `photo_type=start` and a
           real image file — expect 200 with photo_url like /api/uploads/duty_photos/<uuid>.png.
           Verify the URL is publicly fetchable (200 image response) and duty slip now has
           start_photo_url populated.
        4) POST /api/driver/trips/{id}/complete with closing_km, traveller_name, passenger_signature,
           latitude, longitude, address — verify completed_at, end_location, traveller_name,
           and passenger_signature all set; trip status COMPLETED; duty slip status SIGNED.
        5) POST /api/driver/trips/{id}/upload-photo with photo_type=end — verify end_photo_url set.
      Do NOT test the Flutter app itself (no simulator here). Test only the backend endpoints.