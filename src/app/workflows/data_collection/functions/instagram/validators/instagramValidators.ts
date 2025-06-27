import { InstagramApiMediaNode, InstagramApiUserNode } from '../../../types/instagramTypes';

/**
 * Validates an Instagram API Media Node.
 * This is a basic validator. For more complex scenarios, consider using a library like Zod.
 * @param mediaNode The media node data from the Instagram API.
 * @returns True if the media node is valid, false otherwise.
 */
export function isValidInstagramApiMediaNode(mediaNode: any): mediaNode is InstagramApiMediaNode {
  if (!mediaNode || typeof mediaNode !== 'object') {
    console.warn('Validation failed: mediaNode is not an object or is null.');
    return false;
  }

  const requiredFields: (keyof InstagramApiMediaNode)[] = ['id', 'media_type', 'timestamp', 'username'];
  for (const field of requiredFields) {
    if (!(field in mediaNode) || mediaNode[field] === null || mediaNode[field] === undefined) {
      console.warn(`Validation failed: mediaNode missing or has null/undefined required field: ${String(field)}`);
      return false;
    }
  }

  if (typeof mediaNode.id !== 'string') {
    console.warn('Validation failed: mediaNode.id is not a string.');
    return false;
  }
  if (typeof mediaNode.media_type !== 'string' || !['IMAGE', 'VIDEO', 'CAROUSEL_ALBUM'].includes(mediaNode.media_type)) {
    console.warn('Validation failed: mediaNode.media_type is invalid.');
    return false;
  }
  if (typeof mediaNode.timestamp !== 'string' || isNaN(Date.parse(mediaNode.timestamp))) {
    console.warn('Validation failed: mediaNode.timestamp is not a valid ISO date string.');
    return false;
  }
  if (typeof mediaNode.username !== 'string') {
    console.warn('Validation failed: mediaNode.username is not a string.');
    return false;
  }

  // Optional fields type checks (example)
  if (mediaNode.caption !== undefined && mediaNode.caption !== null && typeof mediaNode.caption !== 'string') {
    console.warn('Validation failed: mediaNode.caption is not a string or null/undefined.');
    return false;
  }
  if (mediaNode.like_count !== undefined && typeof mediaNode.like_count !== 'number') {
    console.warn('Validation failed: mediaNode.like_count is not a number.');
    return false;
  }
  if (mediaNode.comments_count !== undefined && typeof mediaNode.comments_count !== 'number') {
    console.warn('Validation failed: mediaNode.comments_count is not a number.');
    return false;
  }

  if (mediaNode.media_type === 'CAROUSEL_ALBUM') {
    if (!mediaNode.children || !mediaNode.children.data || !Array.isArray(mediaNode.children.data)) {
      console.warn('Validation failed: CAROUSEL_ALBUM mediaNode missing or has invalid children.data.');
      return false;
    }
    // Optionally, validate each child item
    // for (const child of mediaNode.children.data) {
    //   if (!isValidInstagramApiMediaNode(child)) return false; // Simplified, might need different validation for children
    // }
  }

  return true;
}

/**
 * Validates an Instagram API User Node.
 * This is a basic validator.
 * @param userNode The user node data from the Instagram API.
 * @returns True if the user node is valid, false otherwise.
 */
export function isValidInstagramApiUserNode(userNode: any): userNode is InstagramApiUserNode {
  if (!userNode || typeof userNode !== 'object') {
    console.warn('Validation failed: userNode is not an object or is null.');
    return false;
  }

  const requiredFields: (keyof InstagramApiUserNode)[] = ['id', 'username'];
  for (const field of requiredFields) {
    if (!(field in userNode) || userNode[field] === null || userNode[field] === undefined) {
      console.warn(`Validation failed: userNode missing or has null/undefined required field: ${String(field)}`);
      return false;
    }
  }

  if (typeof userNode.id !== 'string') {
    console.warn('Validation failed: userNode.id is not a string.');
    return false;
  }
  if (typeof userNode.username !== 'string') {
    console.warn('Validation failed: userNode.username is not a string.');
    return false;
  }

  // Optional fields type checks (example)
  if (userNode.followers_count !== undefined && typeof userNode.followers_count !== 'number') {
    console.warn('Validation failed: userNode.followers_count is not a number.');
    return false;
  }
  if (userNode.media_count !== undefined && typeof userNode.media_count !== 'number') {
    console.warn('Validation failed: userNode.media_count is not a number.');
    return false;
  }

  return true;
}
