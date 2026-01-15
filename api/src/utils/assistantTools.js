const { Type } = require('@google/genai');

// Function tools for AI assistant to query database
const tools = [
  {
    name: 'get_user_count_statistics',
    description: 'Get aggregate statistics about registered users including total counts and registration trends',
    parameters: {
      type: Type.OBJECT,
      properties: {
        filter: {
          type: Type.OBJECT,
          description: 'Optional filtering rules (date range, user type, etc.)'
        }
      },
      required: []
    }
  },
  {
    name: 'get_display_member_signups',
    description: 'Get member sign-up statistics with filtering by date, gender, age group, and granularity',
    parameters: {
      type: Type.OBJECT,
      properties: {
        startDate: { type: Type.STRING, description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: Type.STRING, description: 'End date (YYYY-MM-DD)' },
        gender: { type: Type.STRING, enum: ['All', 'M', 'F'], description: 'Gender filter' },
        ageGroup: { type: Type.STRING, enum: ['All', 'Children', 'Youth', 'Adults', 'Seniors'], description: 'Age group filter' },
        granularity: { type: Type.STRING, enum: ['day', 'month', 'year'], description: 'Time granularity for data' }
      },
      required: []
    }
  },
  {
    name: 'get_common_languages',
    description: 'Retrieve common languages used by members',
    parameters: {
      type: Type.OBJECT,
      properties: {
        limit: { type: Type.INTEGER, description: 'Maximum languages to return (default: 10)' }
      },
      required: []
    }
  },
  {
    name: 'get_audio_engagement',
    description: 'Retrieve audio engagement metrics (play_count, completion_rate, listen_duration)',
    parameters: {
      type: Type.OBJECT,
      properties: {
        metric: { type: Type.STRING, enum: ['play_count', 'completion_rate', 'listen_duration'], description: 'The metric to retrieve' },
        exhibitId: { type: Type.STRING, description: 'Optional: specific exhibit ID to analyze' },
        startDate: { type: Type.STRING, description: 'Start date for filtering (YYYY-MM-DD)' },
        endDate: { type: Type.STRING, description: 'End date for filtering (YYYY-MM-DD)' }
      },
      required: ['metric']
    }
  },
  {
    name: 'get_exhibit_scans',
    description: 'Get QR code scan statistics per exhibit',
    parameters: {
      type: Type.OBJECT,
      properties: {
        exhibitId: { type: Type.STRING, description: 'Optional: specific exhibit ID to analyze' }
      },
      required: []
    }
  },
  {
    name: 'get_time_series',
    description: 'Get time series data for audio completion rates or listen duration',
    parameters: {
      type: Type.OBJECT,
      properties: {
        metric: { type: Type.STRING, enum: ['completion_rate', 'listen_duration'], description: 'The metric to retrieve over time' },
        startDate: { type: Type.STRING, description: 'Start date (YYYY-MM-DD)' },
        endDate: { type: Type.STRING, description: 'End date (YYYY-MM-DD)' },
        granularity: { type: Type.STRING, enum: ['day', 'month', 'year'], description: 'Time granularity' }
      },
      required: ['metric']
    }
  },
  {
    name: 'get_all_users',
    description: 'Retrieve all users with pagination, sorting, and advanced filtering',
    parameters: {
      type: Type.OBJECT,
      properties: {
        page: { type: Type.INTEGER, description: 'Page number (default: 1)' },
        pageSize: { type: Type.INTEGER, description: 'Users per page (default: 10)' },
        sortBy: { type: Type.STRING, description: 'Field to sort by (e.g., createdAt, age)' },
        order: { type: Type.STRING, enum: ['asc', 'desc'], description: 'Sort order' },
        search: { type: Type.STRING, description: 'Search term for username, first/last name' },
        ageMin: { type: Type.INTEGER, description: 'Minimum age filter' },
        ageMax: { type: Type.INTEGER, description: 'Maximum age filter' },
        gender: { type: Type.STRING, enum: ['M', 'F'], description: 'Gender filter' },
        languageCode: { type: Type.STRING, description: 'Language code filter' }
      },
      required: []
    }
  },
  {
    name: 'get_all_audit_logs',
    description: 'Retrieve all admin audit logs with pagination, sorting, and optional filtering',
    parameters: {
      type: Type.OBJECT,
      properties: {
        page: { type: Type.INTEGER, description: 'Page number (default: 1)' },
        pageSize: { type: Type.INTEGER, description: 'Logs per page (default: 10)' },
        sortBy: { type: Type.STRING, description: 'Field to sort by (e.g., timestamp)' },
        order: { type: Type.STRING, enum: ['asc', 'desc'], description: 'Sort order' },
        search: { type: Type.STRING, description: 'Search term for resource or action' }
      },
      required: []
    }
  },
  {
    name: 'get_all_event_logs',
    description: 'Retrieve all event logs with pagination, sorting, and optional filtering',
    parameters: {
      type: Type.OBJECT,
      properties: {
        page: { type: Type.INTEGER, description: 'Page number (default: 1)' },
        pageSize: { type: Type.INTEGER, description: 'Logs per page (default: 10)' },
        sortBy: { type: Type.STRING, description: 'Field to sort by (e.g., timestamp)' },
        order: { type: Type.STRING, enum: ['asc', 'desc'], description: 'Sort order' },
        search: { type: Type.STRING, description: 'Search term for event type or metadata' }
      },
      required: []
    }
  },
  {
    name: 'get_all_exhibits',
    description: 'Retrieve all exhibits from the museum database with pagination and filtering',
    parameters: {
      type: Type.OBJECT,
      properties: {
        page: { type: Type.INTEGER, description: 'Page number (default: 1)' },
        pageSize: { type: Type.INTEGER, description: 'Exhibits per page (default: 20)' },
        search: { type: Type.STRING, description: 'Search term for exhibit title or description' },
        sortBy: { type: Type.STRING, description: 'Field to sort by (e.g., title, createdAt)' },
        order: { type: Type.STRING, enum: ['asc', 'desc'], description: 'Sort order' }
      },
      required: []
    }
  },
  {
    name: 'get_exhibit_by_id',
    description: 'Get detailed information about a specific exhibit by ID',
    parameters: {
      type: Type.OBJECT,
      properties: {
        exhibitId: { type: Type.STRING, description: 'Exhibit ID (UUID)' }
      },
      required: ['exhibitId']
    }
  },
  {
    name: 'get_all_reviews',
    description: 'Retrieve user reviews with pagination and filtering',
    parameters: {
      type: Type.OBJECT,
      properties: {
        page: { type: Type.INTEGER, description: 'Page number (default: 1)' },
        pageSize: { type: Type.INTEGER, description: 'Reviews per page (default: 10)' },
        sortBy: { type: Type.STRING, description: 'Field to sort by (e.g., createdAt, rating)' },
        order: { type: Type.STRING, enum: ['asc', 'desc'], description: 'Sort order' },
        search: { type: Type.STRING, description: 'Search term for review text' }
      },
      required: []
    }
  }
];

module.exports = { tools };

