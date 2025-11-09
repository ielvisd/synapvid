/**
 * Error parsing utilities to convert technical errors into user-friendly messages
 */

export interface ParsedError {
  userMessage: string;
  technicalDetails: string;
  canRetry: boolean;
}

/**
 * Parse an error message and extract user-friendly information
 */
export function parseError(error: any): ParsedError {
  const errorMessage = error?.message || error?.toString() || 'An unknown error occurred';
  const fullError = typeof error === 'string' ? error : errorMessage;

  // Check for ffprobe permission errors
  if (fullError.includes('Permission denied') && fullError.includes('ffprobe')) {
    return {
      userMessage: 'Audio processing tool requires permissions. This has been automatically fixed - please try again.',
      technicalDetails: errorMessage,
      canRetry: true
    };
  }

  // Check for ffprobe not found errors
  if (fullError.includes('ffprobe') && (fullError.includes('not found') || fullError.includes('ENOENT'))) {
    return {
      userMessage: 'Audio processing tool is missing. Please reinstall dependencies and restart the server.',
      technicalDetails: errorMessage,
      canRetry: false
    };
  }

  // Check for TTS API errors
  if (fullError.includes('OpenAI') || fullError.includes('TTS')) {
    if (fullError.includes('API key')) {
      return {
        userMessage: 'OpenAI API key is missing or invalid. Please check your configuration.',
        technicalDetails: errorMessage,
        canRetry: false
      };
    }
    if (fullError.includes('401') || fullError.includes('Unauthorized')) {
      return {
        userMessage: 'Invalid OpenAI API key. Please check your API key in the configuration.',
        technicalDetails: errorMessage,
        canRetry: false
      };
    }
    if (fullError.includes('429') || fullError.includes('rate limit')) {
      return {
        userMessage: 'OpenAI API rate limit exceeded. Please wait a moment and try again.',
        technicalDetails: errorMessage,
        canRetry: true
      };
    }
    if (fullError.includes('500') || fullError.includes('503')) {
      return {
        userMessage: 'OpenAI service is temporarily unavailable. Please try again in a moment.',
        technicalDetails: errorMessage,
        canRetry: true
      };
    }
  }

  // Check for network errors
  if (fullError.includes('fetch') || fullError.includes('network') || fullError.includes('ECONNREFUSED')) {
    return {
      userMessage: 'Network connection error. Please check your internet connection and try again.',
      technicalDetails: errorMessage,
      canRetry: true
    };
  }

  // Check for file system errors
  if (fullError.includes('ENOENT') || fullError.includes('file not found')) {
    return {
      userMessage: 'A required file is missing. Please try regenerating the audio.',
      technicalDetails: errorMessage,
      canRetry: true
    };
  }

  // Check for audio duration errors
  if (fullError.includes('audio duration') || fullError.includes('Failed to get audio duration')) {
    return {
      userMessage: 'Unable to process audio file. The audio may be corrupted or in an unsupported format.',
      technicalDetails: errorMessage,
      canRetry: true
    };
  }

  // Generic synthesis errors
  if (fullError.includes('synthesize') || fullError.includes('Synthesis')) {
    return {
      userMessage: 'Failed to generate audio narration. Please check your internet connection and try again.',
      technicalDetails: errorMessage,
      canRetry: true
    };
  }

  // Default: return the error message but make it slightly more user-friendly
  return {
    userMessage: 'An error occurred while processing your request.',
    technicalDetails: errorMessage,
    canRetry: true
  };
}

