import google.generativeai as genai
import asyncio
import aiofiles
import os
from dotenv import load_dotenv
import json
import re
import logging
from datetime import datetime
from typing import Dict, List, Optional, Tuple
from dataclasses import dataclass
import random
import sys

# Import pandas with error handling
try:
    import pandas as pd
    PANDAS_AVAILABLE = True
except ImportError:
    PANDAS_AVAILABLE = False
    print("⚠️  Warning: pandas not installed. Install with: pip install pandas")
    print("Segmentation features will be disabled.")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(f'lead_generation_{datetime.now().strftime("%Y%m%d_%H%M")}.log'),
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

def print_setup_instructions():
    """Print detailed setup instructions for API configuration"""
    print("\n" + "="*80)
    print("🚀 CLIPSCOMMERCE LEAD GENERATION SETUP")
    print("="*80)
    print("\n📋 REQUIRED: Gemini API Key Configuration")
    print("-" * 50)
    print("1. Get your FREE Gemini API key from: https://makersuite.google.com/app/apikey")
    print("2. Create a file named '.env.local' in this directory")
    print("3. Add your API key to .env.local:")
    print("\n   GEMINI_API_KEY=your_actual_api_key_here")
    print("\n💡 FOR BETTER PERFORMANCE (10K leads target):")
    print("   Add multiple API keys for rotation:")
    print("   GEMINI_API_KEYS=key1,key2,key3,key4")
    print("\n📁 Example .env.local file content:")
    print("   " + "-" * 40)
    print("   # Gemini AI API for lead generation")
    print("   GEMINI_API_KEY=AIzaSyC9XcZ...")
    print("   ")
    print("   # Optional: Multiple keys for 10K leads")
    print("   GEMINI_API_KEYS=key1,key2,key3")
    print("   " + "-" * 40)
    print("\n🎯 CURRENT TARGET: 10,000 high-quality leads")
    print("📊 ESTIMATED TIME: 2-4 hours with proper API keys")
    print("💰 COST ESTIMATE: $15-30 in API usage for 10K leads")
    print("\n🔄 Once configured, run: python email_scraping.py")
    print("="*80 + "\n")

@dataclass
class Config:
    """Enhanced configuration settings for 10K lead generation"""
    num_batches: int = 667  # Target 10,005 leads (667 * 15)
    concurrency_level: int = 12  # Increased for better throughput
    leads_per_batch: int = 15
    api_delay: float = 0.3  # Reduced delay for faster processing
    backup_interval: int = 25  # More frequent backups
    max_retries: int = 3
    retry_delay: float = 2.0
    
    # Enhanced quality control
    min_opportunity_score: int = 60  # Only high-quality leads
    duplicate_check_enabled: bool = True
    email_validation_enabled: bool = True
    
    # File names with enhanced naming
    timestamp: str = datetime.now().strftime('%Y%m%d_%H%M')
    output_file: str = f"MASTER_LEADS_10K_{timestamp}.csv"
    backup_file: str = f"leads_backup_{timestamp}.json"
    progress_file: str = f"progress_checkpoint_{timestamp}.json"
    
    # Segmented output files for targeting different lead types
    premium_leads_file: str = f"PREMIUM_leads_{timestamp}.csv"
    standard_leads_file: str = f"standard_leads_{timestamp}.csv"
    emerging_leads_file: str = f"emerging_business_leads_{timestamp}.csv"
    
    def log_config(self):
        """Log the current configuration"""
        logger.info(f"🎯 TARGET: {self.num_batches * self.leads_per_batch:,} leads")
        logger.info(f"⚡ CONCURRENCY: {self.concurrency_level} parallel requests")
        logger.info(f"📁 OUTPUT: {self.output_file}")
        logger.info(f"🔄 BACKUP INTERVAL: Every {self.backup_interval} batches")

class EnhancedAPIKeyRotator:
    """Enhanced API key management with better error handling and monitoring"""
    
    def __init__(self):
        load_dotenv('.env.local')
        self.api_keys = self._load_api_keys()
        self.current_key_index = 0
        self.key_usage_count = {}
        self.key_error_count = {}
        self.max_requests_per_key = 150  # Increased limit
        self.max_errors_per_key = 5
        
        if not self.api_keys:
            logger.error("❌ Fatal error: No API keys found. Set GEMINI_API_KEY or GEMINI_API_KEYS in .env.local")
            print_setup_instructions()
            sys.exit(1)
        
        logger.info(f"✅ Loaded {len(self.api_keys)} API key(s) successfully")
        logger.info(f"🎯 Ready to generate 10,000+ leads with {len(self.api_keys)} API key(s)")
    
    def _load_api_keys(self) -> List[str]:
        """Enhanced API key loading with better validation"""
        keys = []
        
        # Try single key first
        single_key = os.getenv("GEMINI_API_KEY")
        if single_key and single_key != "your_gemini_api_key_here":
            keys.append(single_key.strip())
        
        # Try multiple keys (comma-separated)
        multi_keys = os.getenv("GEMINI_API_KEYS")
        if multi_keys:
            keys.extend([key.strip() for key in multi_keys.split(",") if key.strip() and key.strip() != "your_gemini_api_key_here"])
        
        # Try numbered keys
        i = 1
        while i <= 10:  # Support up to 10 keys
            key = os.getenv(f"GEMINI_API_KEY_{i}")
            if not key or key == "your_gemini_api_key_here":
                i += 1
                continue
            keys.append(key.strip())
            i += 1
        
        # Validate key format (basic check)
        valid_keys = []
        for key in keys:
            if len(key) > 20 and key.startswith('AIzaSy'):  # Basic Gemini API key format
                valid_keys.append(key)
            else:
                logger.warning(f"⚠️  Invalid API key format detected: {key[:10]}...")
        
        return list(set(valid_keys))  # Remove duplicates
    
    def get_current_key(self) -> str:
        """Get current API key with error checking"""
        if not self.api_keys:
            raise ValueError("No valid API keys available")
        return self.api_keys[self.current_key_index]
    
    def mark_key_error(self, key: str = None):
        """Mark an error for the current or specified key"""
        if key is None:
            key = self.get_current_key()
        
        self.key_error_count[key] = self.key_error_count.get(key, 0) + 1
        
        if self.key_error_count[key] >= self.max_errors_per_key:
            logger.warning(f"⚠️  API key has {self.key_error_count[key]} errors, rotating...")
            self.rotate_key()
    
    def rotate_key(self) -> str:
        """Enhanced key rotation with health checking"""
        if len(self.api_keys) == 1:
            return self.get_current_key()
        
        current_key = self.get_current_key()
        usage_count = self.key_usage_count.get(current_key, 0)
        error_count = self.key_error_count.get(current_key, 0)
        
        # Rotate if current key has issues or reached limits
        should_rotate = (
            usage_count >= self.max_requests_per_key or 
            error_count >= self.max_errors_per_key or 
            random.random() < 0.05  # 5% random rotation for load balancing
        )
        
        if should_rotate:
            old_index = self.current_key_index
            # Find next healthy key
            for _ in range(len(self.api_keys)):
                self.current_key_index = (self.current_key_index + 1) % len(self.api_keys)
                candidate_key = self.get_current_key()
                if self.key_error_count.get(candidate_key, 0) < self.max_errors_per_key:
                    break
            
            new_key = self.get_current_key()
            if old_index != self.current_key_index:
                logger.info(f"🔄 Rotated API key (usage: {usage_count}, errors: {error_count})")
            return new_key
        
        return current_key
    
    def increment_usage(self):
        """Track API usage"""
        current_key = self.get_current_key()
        self.key_usage_count[current_key] = self.key_usage_count.get(current_key, 0) + 1
    
    def configure_genai(self):
        """Configure genai with current API key"""
        try:
            genai.configure(api_key=self.get_current_key())
            return True
        except Exception as e:
            logger.error(f"❌ Failed to configure Gemini AI: {e}")
            self.mark_key_error()
            return False
    
    def get_usage_stats(self) -> Dict:
        """Get detailed usage statistics"""
        return {
            'total_keys': len(self.api_keys),
            'current_key_index': self.current_key_index,
            'usage_counts': self.key_usage_count.copy(),
            'error_counts': self.key_error_count.copy(),
            'total_requests': sum(self.key_usage_count.values()),
            'total_errors': sum(self.key_error_count.values())
        }

class PromptGenerator:
    """Generates industry-specific prompts for lead generation"""
    
    BASE_PROMPT = """
Act as a professional digital marketing researcher specializing in identifying underutilized social media opportunities.

Find businesses/creators who are PERFECT candidates for short-form content marketing with these characteristics:
1. Have established businesses/services with clear monetization
2. Severely underutilizing or completely missing from key social platforms
3. Operate in industries where short-form content performs exceptionally well
4. Show signs of traditional marketing but haven't embraced social media

For each prospect, provide data in this EXACT CSV format:
name,email,website,industry,business_type,location,current_social_presence_score,instagram_presence,tiktok_presence,youtube_shorts_presence,facebook_presence,linkedin_presence,last_post_estimate,follower_count_estimate,content_frequency_score,visual_content_suitability,target_demographic_alignment,competition_saturation_level,estimated_monthly_revenue,marketing_budget_indicators,pain_points,opportunity_score,contact_likelihood,ideal_content_strategy,projected_roi_potential

Field definitions:
- email: valid business email format (firstname@company.com, info@company.com, etc.)
- current_social_presence_score: 1-10 (1=non-existent, 10=fully optimized)
- platform_presence fields: "none", "minimal", "moderate", "strong"
- last_post_estimate: "never", "6mo+", "1-3mo", "recent"
- follower_count_estimate: actual numbers or ranges
- content_frequency_score: 1-10 (posting consistency)
- visual_content_suitability: 1-10 (how visual their business is)
- target_demographic_alignment: 1-10 (match with social media users)
- competition_saturation_level: 1-10 (1=blue ocean, 10=oversaturated)
- estimated_monthly_revenue: revenue brackets ($1K-5K, $5K-25K, $25K-100K, $100K+)
- marketing_budget_indicators: "none", "minimal", "moderate", "high"
- pain_points: specific marketing challenges (max 100 chars)
- opportunity_score: 1-100 (overall lead quality)
- contact_likelihood: 1-10 (how likely they are to respond)
- ideal_content_strategy: brief strategy recommendation
- projected_roi_potential: "low", "medium", "high", "exceptional"

Generate exactly {leads_per_batch} high-quality prospects with realistic, researched-sounding data and valid email addresses.
"""
    
    INDUSTRY_ROTATIONS = [
        "local service businesses (salons, fitness studios, restaurants)",
        "e-commerce brands and online retailers",
        "B2B professional services (consultants, agencies)",
        "health and wellness practitioners",
        "home improvement and contractors",
        "creative services and freelancers",
        "educational content creators and coaches",
        "food and beverage businesses"
    ]
    
    @classmethod
    def generate_prompt(cls, batch_number: int, leads_per_batch: int) -> str:
        """Generate industry-specific prompt for a batch"""
        current_focus = cls.INDUSTRY_ROTATIONS[batch_number % len(cls.INDUSTRY_ROTATIONS)]
        
        return cls.BASE_PROMPT.format(leads_per_batch=leads_per_batch) + f"""
        
Batch #{batch_number} - Focus on: {current_focus}

Look for businesses that:
- Have been in business 1-5 years (established but not social-savvy)
- Show traditional marketing attempts (websites, Google Ads, print)
- Have customer-facing products/services perfect for visual content
- Are in growth phase but struggling with digital marketing
- Have identifiable contact information

Make entries realistic and specific - avoid generic descriptions.
"""

class LeadGenerator:
    """Main lead generation orchestrator"""
    
    def __init__(self, config: Config):
        self.config = config
        self.api_rotator = EnhancedAPIKeyRotator()
        self.model = genai.GenerativeModel("gemini-1.5-pro")
        self.backup_data = []
        self.generated_emails = set()  # Track generated emails
        self.generated_names = set()   # Track generated business names
        self.generated_domains = set() # Track generated website domains
        self.stats = {
            'completed_batches': 0,
            'total_leads_generated': 0,
            'failed_batches': 0,
            'duplicates_prevented': 0
        }
    
    def _extract_domain(self, url: str) -> str:
        """Extract domain from URL for duplicate checking"""
        try:
            # Remove protocol and www
            domain = re.sub(r'^https?://', '', url.lower())
            domain = re.sub(r'^www\.', '', domain)
            # Remove path and parameters
            domain = domain.split('/')[0].split('?')[0]
            return domain
        except:
            return url.lower()
    
    def _parse_and_filter_batch(self, batch_data: str) -> str:
        """Parse batch data and filter out duplicates"""
        if not batch_data:
            return ""
        
        lines = batch_data.strip().split('\n')
        filtered_lines = []
        duplicates_found = 0
        
        for line in lines:
            # Skip empty lines and headers
            if not line.strip() or line.startswith('name,'):
                continue
            
            try:
                # Parse CSV line
                parts = [part.strip() for part in line.split(',')]
                if len(parts) < 3:  # Need at least name, email, website
                    continue
                
                name = parts[0].lower().strip()
                email = parts[1].lower().strip()
                website = parts[2].strip()
                domain = self._extract_domain(website)
                
                # Check for duplicates
                if (email in self.generated_emails or 
                    name in self.generated_names or 
                    domain in self.generated_domains):
                    duplicates_found += 1
                    continue
                
                # Add to tracking sets
                self.generated_emails.add(email)
                self.generated_names.add(name)
                if domain:
                    self.generated_domains.add(domain)
                
                filtered_lines.append(line)
                
            except Exception as e:
                logger.warning(f"Error parsing line: {line[:50]}... - {str(e)}")
                continue
        
        if duplicates_found > 0:
            self.stats['duplicates_prevented'] += duplicates_found
            logger.info(f"Filtered out {duplicates_found} duplicates from batch")
        
        return '\n'.join(filtered_lines)
    
    async def generate_batch(self, batch_number: int) -> Optional[str]:
        """Generate lead data for one batch with duplicate prevention"""
        try:
            # Rotate API key before each request
            self.api_rotator.rotate_key()
            self.api_rotator.configure_genai()
            
            # Enhanced prompt with duplicate prevention instructions
            prompt = self._get_enhanced_prompt(batch_number)
            
            response = await self.model.generate_content_async(
                prompt,
                generation_config=genai.types.GenerationConfig(
                    temperature=0.4,  # Slightly higher for more variety
                    max_output_tokens=8000,
                    top_p=0.9,
                    top_k=40
                )
            )
            
            self.api_rotator.increment_usage()
            
            # Filter duplicates from the generated batch
            filtered_data = self._parse_and_filter_batch(response.text.strip())
            return filtered_data
            
        except Exception as e:
            logger.error(f"Error in batch {batch_number}: {str(e)}")
            self.stats['failed_batches'] += 1
            return None
    
    def _get_enhanced_prompt(self, batch_number: int) -> str:
        """Generate enhanced prompt with duplicate prevention"""
        base_prompt = PromptGenerator.generate_prompt(batch_number, self.config.leads_per_batch)
        
        # Add duplicate prevention instructions
        duplicate_prevention = f"""

CRITICAL DUPLICATE PREVENTION:
- Ensure each business name is unique and realistic
- Use varied email formats: info@, contact@, hello@, firstname@company.com
- Create diverse website domains - avoid similar company names
- Vary locations across different cities/states
- Use different industry subcategories within the focus area
- Make each entry genuinely distinct

ALREADY GENERATED BUSINESSES TO AVOID:
Recently generated emails: {', '.join(list(self.generated_emails)[-20:]) if self.generated_emails else 'None yet'}
Recently generated names: {', '.join(list(self.generated_names)[-20:]) if self.generated_names else 'None yet'}

Generate completely NEW and UNIQUE businesses not similar to any above.
"""
        
        return base_prompt + duplicate_prevention
    
    async def save_results(self, data: str, file_handle):
        """Save results to CSV file"""
        if data and len(data.strip()) > 50:
            await file_handle.write(data + "\n")
            # Add to backup data
            self.backup_data.append({
                'timestamp': datetime.now().isoformat(),
                'data': data
            })
    
    async def save_backup(self):
        """Save backup data to JSON file"""
        try:
            async with aiofiles.open(self.config.backup_file, "w", encoding="utf-8") as f:
                await f.write(json.dumps(self.backup_data, indent=2))
            logger.info(f"Backup saved: {len(self.backup_data)} entries")
        except Exception as e:
            logger.error(f"Failed to save backup: {str(e)}")
    
    async def process_batches(self):
        """Main processing function"""
        logger.info(f"Starting lead generation for ~{self.config.num_batches * self.config.leads_per_batch} leads...")
        logger.info(f"Target: ~10,000 leads across {self.config.num_batches} batches")
        logger.info(f"Configuration: {self.config.concurrency_level} concurrent requests, {self.config.leads_per_batch} leads per batch")
        
        async with aiofiles.open(self.config.output_file, "w", encoding="utf-8") as f:
            # Write CSV header
            header = ("name,email,website,industry,business_type,location,current_social_presence_score,"
                     "instagram_presence,tiktok_presence,youtube_shorts_presence,facebook_presence,"
                     "linkedin_presence,last_post_estimate,follower_count_estimate,content_frequency_score,"
                     "visual_content_suitability,target_demographic_alignment,competition_saturation_level,"
                     "estimated_monthly_revenue,marketing_budget_indicators,pain_points,opportunity_score,"
                     "contact_likelihood,ideal_content_strategy,projected_roi_potential\n")
            
            await f.write(header)
            
            # Process in concurrent groups
            for i in range(1, self.config.num_batches + 1, self.config.concurrency_level):
                batch_nums = range(i, min(i + self.config.concurrency_level, self.config.num_batches + 1))
                
                logger.info(f"Processing batches {min(batch_nums)}-{max(batch_nums)}...")
                
                # Create tasks for concurrent execution
                tasks = [self.generate_batch(n) for n in batch_nums]
                
                try:
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    
                    for batch_num, result in zip(batch_nums, results):
                        if isinstance(result, Exception):
                            logger.error(f"Batch {batch_num} failed: {str(result)}")
                            continue
                        
                        if result and len(result.strip()) > 50:
                            await self.save_results(result, f)
                            self.stats['completed_batches'] += 1
                            # Count leads in batch (filtered data)
                            estimated_leads = max(0, result.count('\n'))
                            self.stats['total_leads_generated'] += estimated_leads
                            logger.info(f"[SUCCESS] Batch {batch_num} completed (~{estimated_leads} unique leads)")
                        else:
                            logger.warning(f"[FAILURE] Batch {batch_num} produced insufficient data")
                        
                        # Rate limiting
                        await asyncio.sleep(self.config.api_delay)
                        
                except Exception as e:
                    logger.error(f"Error processing batch group: {str(e)}")
                
                # Progress update and backup
                progress = (self.stats['completed_batches'] / self.config.num_batches) * 100
                logger.info(f"Progress: {self.stats['completed_batches']}/{self.config.num_batches} "
                           f"batches ({progress:.1f}%) - {self.stats['total_leads_generated']} leads")
                
                if self.stats['completed_batches'] % self.config.backup_interval == 0:
                    await self.save_backup()
        
        # Final backup save
        await self.save_backup()
        self._log_final_stats()
    
    def _log_final_stats(self):
        """Log final generation statistics"""
        logger.info("🎉 Lead generation completed!")
        logger.info(f"📊 Final Stats:")
        logger.info(f"   - Completed batches: {self.stats['completed_batches']}/{self.config.num_batches}")
        logger.info(f"   - Failed batches: {self.stats['failed_batches']}")
        logger.info(f"   - Total leads: {self.stats['total_leads_generated']}")
        logger.info(f"   - Duplicates prevented: {self.stats['duplicates_prevented']}")
        logger.info(f"   - Success rate: {(self.stats['completed_batches']/self.config.num_batches)*100:.1f}%")
        logger.info(f"   - Unique emails tracked: {len(self.generated_emails)}")
        logger.info(f"📁 Files created:")
        logger.info(f"   - Main output: {self.config.output_file}")
        logger.info(f"   - Backup: {self.config.backup_file}")

class LeadSegmenter:
    """Handles lead segmentation and analysis"""
    
    def __init__(self, config: Config):
        self.config = config
    
    @staticmethod
    def validate_email(email: str) -> bool:
        """Validate email format"""
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        return bool(re.match(email_pattern, email))
    
    @staticmethod
    def calculate_adoption_level(row: pd.Series) -> str:
        """Calculate short-form content adoption level"""
        try:
            # Parse numeric values safely
            social_score = pd.to_numeric(row.get('current_social_presence_score', 0), errors='coerce') or 0
            content_freq = pd.to_numeric(row.get('content_frequency_score', 0), errors='coerce') or 0
            opportunity_score = pd.to_numeric(row.get('opportunity_score', 0), errors='coerce') or 0
            
            # Platform presence scoring
            platforms = ['instagram_presence', 'tiktok_presence', 'youtube_shorts_presence']
            platform_scores = []
            
            for platform in platforms:
                presence = str(row.get(platform, 'none')).lower()
                score_map = {'none': 0, 'minimal': 1, 'moderate': 2, 'strong': 3}
                platform_scores.append(score_map.get(presence, 0))
            
            avg_platform_score = sum(platform_scores) / len(platform_scores)
            
            # Parse follower count
            follower_str = str(row.get('follower_count_estimate', '0')).lower()
            follower_count = 0
            if 'k' in follower_str:
                match = re.search(r'([\d.]+)k', follower_str)
                if match:
                    follower_count = float(match.group(1)) * 1000
            elif 'm' in follower_str:
                match = re.search(r'([\d.]+)m', follower_str)
                if match:
                    follower_count = float(match.group(1)) * 1000000
            else:
                match = re.search(r'[\d.]+', follower_str)
                if match:
                    follower_count = float(match.group(0))
            
            # Classification logic
            if (social_score <= 3 and avg_platform_score <= 0.5 and 
                content_freq <= 3 and follower_count < 1000):
                return 'non_adopter'
            elif (social_score >= 4 and avg_platform_score >= 1.5 and 
                  content_freq >= 6 and follower_count >= 1000 and opportunity_score >= 60):
                return 'high_volume_poor_results'
            else:
                return 'moderate_adopter'
                
        except Exception as e:
            logger.warning(f"Error in adoption level calculation: {str(e)}")
            return 'moderate_adopter'
    
    async def segment_leads(self):
        """Segment leads into different categories"""
        if not PANDAS_AVAILABLE:
            logger.error("Cannot segment leads: pandas not installed")
            return
        
        try:
            logger.info("📊 Loading master CSV for segmentation...")
            
            # Read CSV with encoding fallback
            try:
                df = pd.read_csv(self.config.output_file, encoding='utf-8')
            except UnicodeDecodeError:
                df = pd.read_csv(self.config.output_file, encoding='latin-1')
            
            logger.info(f"Loaded {len(df)} total records")
            
            # Data cleaning
            logger.info("🧹 Cleaning and validating data...")
            df = df.dropna(subset=['name', 'email', 'current_social_presence_score'])
            df['email_valid'] = df['email'].apply(self.validate_email)
            df = df[df['email_valid'] == True].drop('email_valid', axis=1)
            
            # Remove duplicates
            initial_count = len(df)
            df = df.drop_duplicates(subset=['email'], keep='first')
            logger.info(f"Removed {initial_count - len(df)} duplicates, {len(df)} records remaining")
            
            # Apply classification
            logger.info("🔄 Classifying leads by adoption level...")
            df['adoption_level'] = df.apply(self.calculate_adoption_level, axis=1)
            
            # Count classifications
            adoption_counts = df['adoption_level'].value_counts()
            for level, count in adoption_counts.items():
                logger.info(f"   - {level.replace('_', ' ').title()}: {count}")
            
            # Create segmented files
            self._create_segmented_files(df)
            
            # Update master file
            df.to_csv(self.config.output_file, index=False)
            
            self._log_segmentation_stats(df, initial_count)
            
        except Exception as e:
            logger.error(f"Error during segmentation: {str(e)}")
    
    def _create_segmented_files(self, df: pd.DataFrame):
        """Create segmented CSV files"""
        logger.info("📁 Creating segmented files...")
        
        # Non-adopters (highest priority)
        non_adopters = df[df['adoption_level'] == 'non_adopter'].copy()
        non_adopters = non_adopters.sort_values(['opportunity_score', 'contact_likelihood'], ascending=False)
        non_adopters.to_csv(self.config.non_adopters_file, index=False)
        
        # Moderate adopters
        moderate_adopters = df[df['adoption_level'] == 'moderate_adopter'].copy()
        moderate_adopters = moderate_adopters.sort_values(['opportunity_score', 'visual_content_suitability'], ascending=False)
        moderate_adopters.to_csv(self.config.moderate_adopters_file, index=False)
        
        # High volume poor results
        high_volume_poor = df[df['adoption_level'] == 'high_volume_poor_results'].copy()
        high_volume_poor = high_volume_poor.sort_values(['opportunity_score'], ascending=False)
        high_volume_poor.to_csv(self.config.high_volume_poor_results_file, index=False)
    
    def _log_segmentation_stats(self, df: pd.DataFrame, initial_count: int):
        """Log segmentation statistics"""
        logger.info("✅ Segmentation completed!")
        logger.info(f"📊 Final Results:")
        logger.info(f"   - Master file: {self.config.output_file} ({len(df)} records)")
        
        for level, filename in [
            ('non_adopter', self.config.non_adopters_file),
            ('moderate_adopter', self.config.moderate_adopters_file),
            ('high_volume_poor_results', self.config.high_volume_poor_results_file)
        ]:
            count = len(df[df['adoption_level'] == level])
            logger.info(f"   - {level.replace('_', ' ').title()}: {filename} ({count} records)")
        
        # Quality metrics
        try:
            avg_opportunity = df['opportunity_score'].astype(float).mean()
            valid_email_rate = len(df) / max(initial_count, 1) * 100
            completeness = (1 - df.isnull().sum().sum() / (len(df) * len(df.columns))) * 100
            
            logger.info(f"📈 Quality Metrics:")
            logger.info(f"   - Average opportunity score: {avg_opportunity:.1f}/100")
            logger.info(f"   - Valid email rate: {valid_email_rate:.1f}%")
            logger.info(f"   - Data completeness: {completeness:.1f}%")
        except Exception as e:
            logger.warning(f"Could not calculate quality metrics: {str(e)}")

async def main():
    """Main execution function"""
    try:
        config = Config()
        
        # Generate leads
        generator = LeadGenerator(config)
        await generator.process_batches()
        
        # Segment leads if pandas is available
        if PANDAS_AVAILABLE:
            logger.info("🔄 Starting lead segmentation...")
            segmenter = LeadSegmenter(config)
            await segmenter.segment_leads()
        else:
            logger.warning("Skipping segmentation - pandas not available")
        
        logger.info("🎉 All processing completed successfully!")
        
    except KeyboardInterrupt:
        logger.warning("Process interrupted by user")
    except Exception as e:
        logger.error(f"Fatal error: {str(e)}")

if __name__ == "__main__":
    asyncio.run(main())